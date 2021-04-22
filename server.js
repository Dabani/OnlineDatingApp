const express = require('express');
// const path = require('path');
const exphbs = require('express-handlebars');
const app = express();

// Environment variable for port
const port = process.env.PORT || 3000;

// Set up view engine

app.engine('handlebars', exphbs({defaultLayout:'main'}));
app.set('view engine', 'handlebars');

// Set up bootstrap

app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use('/js', express.static(__dirname + '/node_modules/@popperjs/core/dist/umd')); // redirect JS jQuery
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap
app.use('/css', express.static(__dirname + '/node_modules/bootstrap-icons/font/')); // redirect CSS bootstrap

app.get('/', (req,res) => {
  res.render('home',{
    "title": "Home"
  });
});

app.get('/about', (req, res) => {
  res.render('about', {
    "title": "About"
  });
});

app.get('/contact', (req, res) => {
  res.render('contact', {
    "title": "Contact"
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
