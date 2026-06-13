const express=require('express')
const cors=require('cors')
const app = express()
const port=process.env.PORT||3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

//middleware
app.use(cors())
app.use(express.json())


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


 //applicationUser
 app.get('/applications',async(req,res)=>{
  const email=req.query.email;
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


