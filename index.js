const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://AlShefa_admin:<password>@cluster0.k2xq3je.mongodb.net/?retryWrites=true&w=majority";


app.get('/', (req, res) => {
  res.send('Hello from Al-Shefa Server!')
})

app.listen(port, () => {
  console.log(`Al-Shefa Server listening on port ${port}`)
})