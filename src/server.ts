import './env';
import app, { initialize } from './app';

const { PORT } = process.env;

initialize();
app.listen(PORT, () => {
  console.log('Velog server is listening to port', PORT);
});
