const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors());
app.use(express.json());

// URI

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k2xq3je.mongodb.net/?retryWrites=true&w=majority`;

// Connection String

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// Async Run Function
async function run(){

  try{
      await client.connect();
      console.log("Database Connected");
      const serviceCollection = client.db("Al-Shefa").collection("Services");

      app.get('/service', async(req,res)=>{
        const query = {};
        const cursor = serviceCollection.find(query);
        const services = await cursor.toArray();
        res.send(services);

      })
  }
  finally{

  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello from Al-Shefa Server!')
})

app.listen(port, () => {
  console.log(`Al-Shefa Server listening on port ${port}`)
})