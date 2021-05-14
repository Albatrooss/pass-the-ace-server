import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

const app = express();

const httpServer = createServer(app);

app.use(cors());

app.get('/', (_, res) => res.send('HELLO WORLD'));

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => console.log(`Server listening on PORT:${PORT}`));
