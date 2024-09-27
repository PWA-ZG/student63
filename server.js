const express = require("express")
const path = require("path")
const httpPort = 80
const bodyParser = require('body-parser')
const fs = require("fs").promises


const app = express()

app.use(express.static(path.join(__dirname, "public")))

app.get("/", async function (req, res) {
  res.sendFile(path.join(__dirname, "public", "index.html"))
});

app.get("/books", function (req, res) {
  const bookName  = req.query.name;
  res.sendFile(path.join(__dirname, "public", "books.html"))
});
app.get("/add", function (req, res) {
    res.sendFile(path.join(__dirname, "public", "add.html"))
});

app.use(bodyParser.json({limit: '100mb'}))

app.post('/upload-photo', async (req, res) => {
    try {
        const { name, imgPath, description } = req.body

        const imgFileName = `./assets/img/${name.replace(/\s+/g, '-')}.png`
        const imgFilePath = path.join(__dirname,'public', imgFileName)

        console.log('Spremanje slike: ' + imgFilePath)
        
        const base64Data = imgPath.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')
        
        await fs.writeFile(imgFilePath, buffer)
        
        // Dodavanje podataka u books.json
        const booksData = JSON.parse(await fs.readFile('./public/books.json', 'utf-8'))

        booksData[name] = {
            name,
            img: imgFileName.replace('./', '/'), 
            description,
        };
        

        await fs.writeFile('./public/books.json', JSON.stringify(booksData), 'utf-8')
        
        res.status(200)
    } catch (error) {
        console.error('Error processing photo:', error)
        res.status(500).json({ error: 'Internal server error.' })
    }
});


app.listen(httpPort, function () {
  console.log(`HTTP listening on port: ${httpPort}`);
});
