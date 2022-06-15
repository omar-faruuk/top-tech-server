const express = require('express')
const app = express()
const cors = require('cors')
const ObjectId = require('mongodb').ObjectId;
const fs = require('fs-extra')
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload')
const { MongoClient, ServerApiVersion } = require('mongodb');
const Stripe = require("stripe")('sk_test_51Kr1v0IpKtf17HlK0UxbP3QBhhGwAFDOlD8fvCQfUmvAkbOe96eg0D0Xjz78oAI3R0kdk3pdwEKmLoLRnUfD3eD600gWkZvB3d');
// const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const port = 5000
require("dotenv").config();

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.x7xfr.mongodb.net/?retryWrites=true&w=majority`;

app.use(cors())
app.use(bodyParser.json({ limit: "50mb" }))
app.use(fileUpload())
app.use(express.static('service'))

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(err => {
  const serviceCollection = client.db("TOP-TECH").collection("services");
  const orderCollection = client.db("TOP-TECH").collection("orders");
  const reviewCollection = client.db("TOP-TECH").collection("reviews");
  const adminCollection = client.db("TOP-TECH").collection("admins");


  app.post('/addservice', async (req, res) => {
    const title = req.body.title;
    const des = req.body.des;
    const pic = req.files.image;
    const price = req.body.price;
    const picData = pic.data;
    const encodedPic = picData.toString('base64');
    const imageBuffer = Buffer.from(encodedPic, 'base64');
    const service = {
      title,
      des,
      price,
      image: imageBuffer
    }
    const result = await serviceCollection.insertOne(service);
    res.send(result.acknowledged);
    console.log(result.acknowledged);
  })

  app.get('/services', async (req, res) => {
    const cursor = serviceCollection.find({})
    const service = await cursor.toArray()
    res.json(service)

    //    .toArray((err, document)=>{
    //        res.send(document)
    //    })
  })

  //payment api
  app.post("/pay", async (req, res) => {
    try {
      const amount = req.body.selectedService.price * 10
      const paymentIntent = await Stripe.paymentIntents.create({
        amount,
        currency: "usd",
        payment_method_types: ["card"],
        metadata: {
          name: "omar vai",
        },
      });
      const clientSecret = paymentIntent.client_secret;
      res.json({ clientSecret, message: "Payment Initiated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/stripe", (req, res) => {
    if (req.body.type === "payment_intent.created") {
    }
    if (req.body.type === "payment_intent.succeeded") {
    }
  });

  // order
  app.post('/addOrder', async (req, res) => {
    const orderDetails = req.body;
    const result = await orderCollection.insertOne(orderDetails)

    res.send(result.acknowledged)

  })
  app.get('/orders', (req, res) => {
    if (req.query.email) {
      const email = req.query.email
      const orders = orderCollection.find({ email: email })
      orders.toArray((err, document) => {
        res.send(document)

      })
    } else {
      const orders = orderCollection.find({})
      orders.toArray((err, document) => {
        res.send(document)

      })
    }
  })

  app.patch('/updateOrderStatus', (req, res) => {
    const { id, status } = req.body
    orderCollection.findOneAndUpdate(
      { _id: ObjectId(id) },
      { $set: { status } }
    )
      .then(result => res.send(result.lastErrorObject.updatedExisting))
      .catch(err => console.log(err))
  })

  //  review
  app.post('/addReview', async (req, res) => {
    const review = req.body;

    const result = await reviewCollection.insertOne(review)
    res.send(result.acknowledged)

  })

  app.get('/reviews', async (req, res) => {
    const reviews = reviewCollection.find({})
    const result = await reviews.toArray()
    res.send(result)

  })

  //update service
  app.patch('/updateService/:id', (req, res) => {
    const title = req.body.title;
    const des = req.body.des;
    const price = req.body.price;
    if (!req.body.image) {
      const picData = req.files.image.data;
      const encodedPic = picData.toString('base64');
      const imageBuffer = Buffer.from(encodedPic, 'base64');

      const serviceInfo = {
        title,
        des,
        price,
        image: imageBuffer
      }
      serviceCollection.updateOne(
        { _id: ObjectId(req.params.id) },
        { $set: serviceInfo }
      )
        .then(result => res.send(result.modifiedCount > 0))
        .catch(err => console.log(err))
    }
    if (req.body.image) {
      const serviceInfo = {
        title,
        des,
        price,
        image: req.body.image
      }
      serviceCollection.updateOne(
        { _id: ObjectId(req.params.id) },
        { $set: serviceInfo }
      )
        .then(result => res.send(result.modifiedCount > 0))
        .catch(err => console.log(err))
    }

  })

  // delete services
  app.delete('/deleteServices/:id', (req, res) => {

    serviceCollection.deleteOne({ _id: ObjectId(req.params.id) })
      .then(result => res.send(result.deletedCount > 0))
      .catch(err => console.log(err))
  })

  //user collection
  app.post('/admin', (req, res) => {
    const admins = req.body;
    adminCollection.insertOne(admins)
      .then(result => res.send(result.acknowledged))
  })

  app.post('/isAdmin', (req, res) => {
    const email = req.body.email;
    // console.log(email);
    adminCollection.find({ adminEmail: email })
      .toArray((err, admin) => {
        res.send(admin.length > 0);
      })


  })

});





app.get('/', (req, res) => {
  res.send('hello world!...')
})

app.listen(process.env.PORT || port, () => {
  console.log(`Example app listening on port ${port}`)
})