import express from 'npm:express';
import fs from "node:fs";

const app = express();

app.get('/express', (req, res) => {

	res.send('Welcome to the Dinosaur API!');
});

app.listen(8000);
