const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { application } = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

// URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k2xq3je.mongodb.net/?retryWrites=true&w=majority`;

// Connection String
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req,res,next){
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message:"Un Authorized Access"});
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
    if(err){
      return res.status(403).send({message:"Forbidden Access"})
    }
    req.decoded = decoded;
    next();
  });
}

// Async Run Function
async function run(){
  try{
    // Database Connection
      await client.connect();
      console.log("Database Connected");
      const serviceCollection = client.db("Al-Shefa").collection("services");
      const bookingCollection = client.db("Al-Shefa").collection("bookings");
      const userCollection = client.db("Al-Shefa").collection("users");
      const doctorCollection = client.db("Al-Shefa").collection("doctors");

      // Verify Admin
      const verifyAdmin = async(req,res,next) =>{
        const requester = req.decoded.email;
        const requesterAccount = await userCollection.findOne({email:requester});
        if(requesterAccount.role === 'admin'){
          next();
        }
        else{
          res.status(403).send({message:'Forbidden Access'});
        }
      }
     

    // Get data According to User
    app.get('/booking',verifyJWT, async(req, res) =>{
      const patient = req.query.patient;
      const authorization = req.headers.authorization;
      const decodedEmail = req.decoded.email;
      if(patient === decodedEmail){
        const query = {patient: patient};
        const bookings = await bookingCollection.find(query).toArray();
        res.send(bookings);
      }
      else{
        return res.status(403).send({message:'forbidden access'});
      }
    });

    // Get Booking According to ID
    app.get('/booking/:id',verifyJWT, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: ObjectId(id)}
      const booking = await bookingCollection.findOne(query);
      res.send(booking);
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
    });


    // Payment API
    app.post("/create-payment-intent",verifyJWT, async(req,res)=>{
      const service = req.body;
      const price = service.price;
      const amount = price*1000;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types:['card']
      });
      res.send({clientSecret:paymentIntent.client_secret})
    });

    // Get Service to show in frontend
      app.get('/service', async(req,res)=>{
        const query = {};
        const cursor = serviceCollection.find(query).project({name:1});
        const services = await cursor.toArray();
        res.send(services); 

      });

      // Get All Users
      app.get('/user',verifyJWT,async(req,res)=>{
        const users = await userCollection.find().toArray();
        res.send(users);
      });

    // Make Someone an Admin
    app.put('/user/admin/:email',verifyJWT,verifyAdmin, async(req,res)=>{  
      const email = req.params.email;
        const filter = {email:email};
        const updateDoc ={
          $set:{role:'admin'},
        };
        const result = await userCollection.updateOne(filter,updateDoc);
        res.send({result});
    });

    // Get Admin
    app.get('/admin/:email', async(req,res)=>{
        const email = req.params.email;
        const user = await userCollection.findOne({email: email});
        const isAdmin = user.role === 'admin';
        res.send({admin: isAdmin})
    })

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
      const token = jwt.sign({email:email},process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'})
      res.send({result,token});
    });

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
      });

      // Get All the Doctor
      app.get('/doctor',verifyJWT,verifyAdmin,async(req,res)=>{
        const doctors = await doctorCollection.find().toArray();
        res.send(doctors);
      });

      //Post doctor data to database
      app.post('/doctor',verifyJWT,verifyAdmin, async(req,res)=>{
        const doctor = req.body;
        const result = await doctorCollection.insertOne(doctor);
        res.send(result);
      }); 

      //Delete Doctor
      app.delete('/doctor/:email',verifyJWT,verifyAdmin, async(req,res)=>{
        const email = req.params.email;
        const filter = {email:email}
        const result = await doctorCollection.deleteOne(filter);
        res.send(result);
      }); 
    }
      finally{

    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello from Al-Shefa Server! update_9/27/22')
})

app.listen(port, () => {
  console.log(`Al-Shefa Server listening on port ${port}`)
})


