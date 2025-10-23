const express=require("express");
const mongoose=require("mongoose");
const Account=require("../models/Account");
const LedgerEntry=require("../models/LedgerEntry");
const Transaction=require("../models/Transaction");
const User=require("../models/User");
const auth=require("../middleware/auth");

const router=express.Router();

router.post("/",auth,async(req,res)=>{
  let sourceAccountId=req.body.sourceAccountId;
  let receiverShareableId=req.body.receiverShareableId;
  let amount=req.body.amount;
  let note=req.body.note;
  let rawKey=req.body.idempotencyKey;

  if(!req.userId) return res.status(401).json({message:"Unauthorized"});

  let amt=Number(amount);

  if(!sourceAccountId || !receiverShareableId)
    return res.status(400).json({message:"Missing required fields"});

  if(!Number.isFinite(amt) || amt<=0)
    return res.status(400).json({message:"Invalid amount"});

  let idempotencyKey="";
  if(typeof rawKey==="string" && rawKey.trim()){
    idempotencyKey=rawKey.trim();
  }else{
    idempotencyKey="AUTO-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);
  }

  let transferId="TRF-"+Date.now()+"-"+Math.random().toString(36).slice(2,8).toUpperCase();

  let expenseTx;

  try{
    expenseTx=await Transaction.create({
      user:req.userId,
      type:"expense",
      category:"Transfer",
      description:note||"Debit Transfer",
      amount:amt,
      status:"pending",
      transferId,
      idempotencyKey
    });
  }
  catch(err){
    if(err.code===11000){
      let existing=await Transaction.findOne({user:req.userId,idempotencyKey});
      return res.status(200).json({message:"Transfer already processed",transaction:existing});
    }
    return res.status(400).json({message:err.message});
  }

  const session=await mongoose.startSession();

  try{
    await session.withTransaction(async()=>{

      let from=await Account.findOne({_id:sourceAccountId,user:req.userId}).session(session);
      if(!from) throw new Error("Source account not found");

      let to=await Account.findOne({plaidAccountId:receiverShareableId}).session(session);
      if(!to) throw new Error("Receiver account not found");

      if(String(from._id)===String(to._id))
        throw new Error("Cannot transfer to same account");

      let receiverUser=await User.findById(to.user).session(session);
      if(!receiverUser) throw new Error("Receiver user not found");

      let ledgerAgg=await LedgerEntry.aggregate([
        {$match:{accountId:from._id}},
        {
          $group:{
            _id:"$accountId",
            totalCredits:{$sum:{$cond:[{$eq:["$type","credit"]},"$amount",0]}},
            totalDebits: {$sum:{$cond:[{$eq:["$type","debit"] },"$amount",0]}}
          }
        }
      ]).session(session);

      let totals=ledgerAgg[0] || {totalCredits:0,totalDebits:0};
      let balance=(totals.totalCredits||0)-(totals.totalDebits||0);

      if(balance<amt) throw new Error("Insufficient funds");

      await LedgerEntry.insertMany([
        {accountId:from._id,type:"debit", amount:amt,transferId,idempotencyKey},
        {accountId:to._id,  type:"credit",amount:amt,transferId,idempotencyKey}
      ],{session});

      await Transaction.create([
        {
          user:receiverUser._id,
          type:"income",
          category:"Transfer",
          description:note||"Credit Received",
          amount:amt,
          status:"completed",
          transferId
        }
      ],{session});

      await Transaction.updateOne(
        {_id:expenseTx._id},
        {status:"completed"},
        {session}
      );
    });

    return res.status(200).json({message:"Transfer successful",transferId});
  }
  catch(err){
    await Transaction.deleteOne({_id:expenseTx._id,status:"pending"});
    return res.status(400).json({message:err.message});
  }
  finally{
    session.endSession();
  }
});

module.exports=router;