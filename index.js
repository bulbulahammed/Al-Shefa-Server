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
    // Database Connection
      await client.connect();
      console.log("Database Connected");
      const serviceCollection = client.db("Al-Shefa").collection("services");
      const bookingCollection = client.db("Al-Shefa").collection("bookings");
      const userCollection = client.db("Al-Shefa").collection("users");
     

    // Get data According to User
    app.get('/booking', async(req, res) =>{
      const patient = req.query.patient;
      const query = {patient: patient};
      const bookings = await bookingCollection.find(query).toArray();
      res.send(bookings);
    })
// Post Booking to Database
    app.post("/add-booking",async(req,res)=>{
      const booking = req.body;
      const query = {treatment: booking.treatment, date: booking.date, patient: booking.patient}
      const exists = await bookingCollection.findOne(query);
      if(exists){
        return res.send({success:false, booking: exists})
      }
      const result = await bookingCollection.insertOne(booking);
      return  res.send({success: true,result});
    })

// Get Service to show in frontend
      app.get('/service', async(req,res)=>{
        const query = {};
        const cursor = serviceCollection.find(query);
        const services = await cursor.toArray();
        res.send(services); 

      });

  // Send/Update user Data in Database
  app.put('/user/:email', async(req,res)=>{  
    const email = req.params.email;
    const user = req.body;
    const filter = {email:email};
    const options  = {upsert:true};
    const updateDoc ={
      $set:user,

    };
    const result = await userCollection.updateOne(filter,updateDoc, options);
    res.send(result);
  })

    // Warning: This is not the proper way to query multiple collection. 
    // After learning more about mongodb. use aggregate, lookup, pipeline, match, group
    app.get('/available', async(req, res) =>{
      const date = req.query.date;

      // step 1:  get all services
      const services = await serviceCollection.find().toArray();

      // step 2: get the booking of that day. output: [{}, {}, {}, {}, {}, {}]
      const query = {date: date};
      const bookings = await bookingCollection.find(query).toArray();

      // step 3: for each service
      services.forEach(service=>{
        // step 4: find bookings for that service. output: [{}, {}, {}, {}]
        const serviceBookings = bookings.filter(book => book.treatment === service.name);
        // step 5: select slots for the service Bookings: ['', '', '', '']
        const bookedSlots = serviceBookings.map(book => book.slot);
        // step 6: select those slots that are not in bookedSlots
        const available = service.slots.filter(slot => !bookedSlots.includes(slot));
        //step 7: set available to slots to make it easier 
        service.slots = available;
      });
     

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