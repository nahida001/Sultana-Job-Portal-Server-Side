const express=require('express')
const cors=require('cors')
const app = express()
const jwt=require('jsonwebtoken')
const cookieParser=require('cookie-parser')

const port=process.env.PORT||3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

//middleware
app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true
}));

app.use(express.json())
app.use(cookieParser())
var admin = require("firebase-admin");

var serviceAccount = require("./firebase_admin_key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const logger=(req,res,next)=>{
  console.log('inside the logger middleWare')
  next()
}

const verifyToken=(req,res,next)=>{
  const token=req?.cookies?.token
console.log('cookie in the middleware',token);
if(!token){
  return res.status(401).send({message:'unauthorized access'})
}
//verify token
jwt.verify(token,process.env.JWT_ACCESS_SECRET,(err,decoded)=>{
if(err){
  return res.status(401).send({message:'unauthorized access'})
}
//console.log(decoded);
req.decoded=decoded
next()
})
}
const verifyfirebaseToken=async(req,res,next)=>{
  const authheader=req.headers.authorization
  const token=authheader.split(' ')[1]
  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }
  const userinfo=await admin.auth().verifyIdToken(token)
 // console.log('fb token',token);
 req.tokenEmail=userinfo.email;
 next()

}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.qxvdmah.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    
    const jobCollection=client.db('sultanaJobPortal').collection('jobs')
    const applicationCollection=client.db('sultanaJobPortal').collection('applicationUser')
    //jobs api
    app.get('/jobs',async(req,res)=>{

      const email=req.query.email
      const query={};
      if(email){
        query.hr_email=email
      }
     // console.log("Email:", email);
    //  console.log("Query:", query);

      const cursor=jobCollection.find(query);
      const result=await cursor.toArray();
     //  console.log("Result:", result);
      res.send(result)
    })

    app.get('/jobs/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)}
      const result=await jobCollection.findOne(query)
      res.send(result)
    })
    app.post('/jobs',async(req,res)=>{
      const newJob=req.body
      console.log(newJob);
      const result=await jobCollection.insertOne(newJob)
      res.send(result)
    })

      //could be done should not be done
      // app.get('/jobByEmailAddress',async(req,res)=>{
      // const email=req.query.email;
      // const query={hr_email:email}
     //  const result=await jobCollection.find(query).toArray();
    //  res.send(result)
   //  })
app.get('/applications/job/:job_id',async(req,res)=>{
  const job_id=req.params.job_id;
  const query={jobId:job_id}
  const result=await applicationCollection.find(query).toArray()
  res.send(result)
})

 //applicationUser
 app.get('/applications',logger,verifyToken,verifyfirebaseToken,async(req,res)=>{
  const email=req.query.email;
  if(req.tokenEmail!=email){
    return res.status(403).send({message :'forbidden access'})
  }
  if(email !== req.decoded.email){
     return res.status(403).send({message:'forbidden access'})
  }
  const query ={
     applicant:email
  }
  const result=await applicationCollection.find(query).toArray()
  //bad way aggregate data
  for(const application of result){
    const jobId=application.jobId;
    const jobquery={_id:new ObjectId(jobId)}
    const job=await jobCollection.findOne(jobquery)
    application.company=job.company
    application.title=job.title;
    application.company_logo=job.company_logo
  }
  res.send(result)
 })
 app.post('/applications',async(req,res)=>{
  const application=req.body
  const result=await applicationCollection.insertOne(application)
  res.send(result)
 })
 //jwt token related api
 app.post('/jwt',async(req,res)=>{
  const userData=req.body;
  const token=jwt.sign(userData,process.env.JWT_ACCESS_SECRET,{expiresIn:'1d'})
 
 //set the token in the cookies
 res.cookie('token',token,{
  httpOnly:true,
  secure:false
 })
  res.send({success:true})

})



 app.patch('/applications/:id',async(req,res)=>{
  const id=req.params.id;
  const filter={_id:new ObjectId(id)}
  const updateDoc={
    $set:{
      status:req.body.status
    }
  }
  const result=await applicationCollection.updateOne(filter,updateDoc)
  res.send(result)
 })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);



app.get('/',async(req,res)=>{
    res.send('Job portal running')
})

app.listen(port, () => {
  console.log(`job portal listening on port ${port}`)
})


