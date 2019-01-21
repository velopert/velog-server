import './env';
import app from './app';

const { PORT } = process.env;
app.listen(PORT, () => {
  console.log('Velog server is listening to port', PORT);
});
