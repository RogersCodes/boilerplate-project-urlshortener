require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('node:dns');

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true})

// Basic Configuration
const port = process.env.PORT || 3000;
const URLSchema = new mongoose.Schema({
  original_url: {type: String, required: true, unique: true},
  short_url: {type: String, required: true, unique: true}
})
let URLModel = mongoose.model("url", URLSchema)
app.use("/", bodyParser.urlencoded({ extended: false})
)

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});
app.get('/api/shorturl/:short_url', function(req, res){
  let short_url = req.params.short_url;
  //find the origialURL from the database
  URLModel.findOne({short_url: short_url}).then((foundURL) => {
    if (foundURL) {
      let original_url = foundURL.original_url;
    res.redirect(original_url)
    } else {
      res.json({error: "The short url does not exist"})
    }
    
  })
  
})
// Your first API endpoint
app.post('/api/shorturl', function(req, res) {
  let url = req.body.url;
  
  //validate url
  try {
    urlObj = new URL(url);
    dns.lookup(urlObj.host, (err, address, family) => {
      //if domain is nonexistent
      if(!address) {
        res.json({ error: 'invalid url'})
      } 
      //valid url
      else {
        let original_url = urlObj.href;

        //check URL is not in the database
        URLModel.findOne({original_url: original_url}).then((foundURL) => {
          if (foundURL) {
            res.json({original_url: foundURL.original_url,
              short_url:foundURL.short_url
            })
          } else {
             
        let short_url = 1;
        //ger the latest shorturl
        URLModel.find({}).sort(
          {short_url: "desc"}).limit(1).then(
          (latestURL) => {
            if (latestURL.length > 0) {
              short_url = parseInt(latestURL[0].short_url) + 1;
            }
            resObj = {
              original_url: original_url,
              short_url: short_url
            }
            //create an entry in the db
            let newURL = new URLModel(resObj);
            newURL.save()
            res.json(resObj);
          }
        )
          }
        })
       
      }
    })
  }
  //if url is invalid
  catch{
    res.json({ error: 'invalid url' })
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
