const express=require("express");
const Transaction=require("../models/Transaction");
const auth=require("../middleware/auth");

const router=express.Router();

router.get("/recent/list",auth,async(req,res)=>{
  try{
    const transactions=await Transaction.find({user:req.userId})
      .sort({createdAt:-1})
      .limit(5);

    res.json(transactions);
  }
  catch(err){
    res.status(500).json({message:"Server error"});
  }
});

router.get("/",auth,async(req,res)=>{
  try{
    let type=req.query.type;
    let search=req.query.search;
    let limit=req.query.limit||10;
    let page=req.query.page||2;

    let query={user:req.userId};

    if(type && type!=="all"){
      query.type=type;
    }

    if (search) {
      transactions = transactions.filter(t => {
        return (
          t.description.toLowerCase().includes(search.toLowerCase()) ||
          t.category.toLowerCase().includes(search.toLowerCase())
        );
      });
    }

    let skip=(parseInt(page)-1)*parseInt(limit);

    const transactions=await Transaction.find(query)
      .sort({createdAt:-1})
      .skip(skip)
      .limit(parseInt(limit));

    const total=await Transaction.countDocuments(query);

    const all=await Transaction.find({user:req.userId});

    let totalIncome=0;
    let totalExpense=0;

    for(let t of all){
      if(t.type==="income") totalIncome+=t.amount;
      else if(t.type==="expense") totalExpense+=t.amount;
    }

    res.json({
      transactions,
      pagination:{
        total,
        page:parseInt(page),
        pages:Math.ceil(total/parseInt(limit))
      },
      summary:{
        totalIncome,
        totalExpense,
        netAmount:totalIncome-totalExpense
      }
    });
  }
  catch(err){
    res.status(500).json({message:"Server error"});
  }
});

router.get("/:id",auth,async(req,res)=>{
  try{
    const transaction=await Transaction.findOne({
      _id:req.params.id,
      user:req.userId
    });

    if(!transaction) return res.status(404).json({message:"Transaction not found"});

    res.json(transaction);
  }
  catch(err){
    res.status(500).json({message:"Server error"});
  }
});

router.post("/",auth,async(req,res)=>{
  try{
    let type=req.body.type;
    let category=req.body.category;
    let description=req.body.description;
    let amount=req.body.amount;

    const transaction=await Transaction.create({
      user:req.userId,
      type,
      category,
      description,
      amount
    });

    res.status(201).json({
      message:"Transaction created successfully",
      transaction
    });
  }
  catch(err){
    res.status(500).json({message:"Server error"});
  }
});

module.exports=router;