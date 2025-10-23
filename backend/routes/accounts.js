const express=require("express");
const Account=require("../models/Account");
const LedgerEntry=require("../models/LedgerEntry");
const auth=require("../middleware/auth");

const router=express.Router();

router.get("/",auth,async(req,res)=>{
  try{
    const accounts=await Account.find({user:req.userId});

    for(let acc of accounts){
      if(!acc.plaidAccountId){
        let id="";
        let exists=true;
        let attempts=0;

        while(exists && attempts<5){
          id="SHR-"+Date.now()+"-"+Math.random().toString(36).slice(2,8).toUpperCase();
          let found=await Account.findOne({plaidAccountId:id});
          exists=found?true:false;
          attempts++;
        }

        acc.plaidAccountId=id;
        await acc.save();
      }
    }

    let totalBalance=0;
    let accountsOut=[];

    for(let acc of accounts){
      let entries=await LedgerEntry.find({accountId:acc._id});

      let credit=0;
      let debit=0;

      for(let e of entries){
        if(e.type==="credit") credit+=e.amount;
        else if(e.type==="debit") debit+=e.amount;
      }

      let balance=credit-debit;
      totalBalance+=balance;

      let obj=acc.toObject();
      obj.balance=balance;
      accountsOut.push(obj);
    }

    res.json({accounts:accountsOut,totalBalance});
  }
  catch(err){
    res.status(500).json({message:"Server error"});
  }
});

router.get("/:id",auth,async(req,res)=>{
  try{
    const account=await Account.findOne({_id:req.params.id,user:req.userId});
    if(!account) return res.status(404).json({message:"Account not found"});
    res.json(account);
  }
  catch(err){
    res.status(500).json({message:"Server error"});
  }
});

router.post("/",auth,async(req,res)=>{
  try{
    const bankName=req.body.bankName;
    const accountType=req.body.accountType;
    const accountNumber=req.body.accountNumber;
    const balance=Number(req.body.balance)||0;

    const account=await Account.create({
      user:req.userId,
      bankName,
      accountType,
      accountNumber
    });

    const fundingId="FUND-"+Date.now()+"-"+Math.random().toString(36).slice(2,10);
    const idem="INIT-"+account._id.toString();

    await LedgerEntry.create({
      accountId:account._id,
      type:"credit",
      amount:balance,
      transferId:fundingId,
      idempotencyKey:idem,
      createdAt:new Date()
    });

    res.status(201).json({message:"Account added successfully",account});
  }
  catch(err){
    res.status(500).json({message:"Server error"});
  }
});

router.delete("/:id",auth,async(req,res)=>{
  try{
    const account=await Account.findOneAndDelete({_id:req.params.id,user:req.userId});
    if(!account) return res.status(404).json({message:"Account not found"});
    res.json({message:"Account deleted successfully"});
  }
  catch(err){
    res.status(500).json({message:"Server error"});
  }
});

module.exports=router;