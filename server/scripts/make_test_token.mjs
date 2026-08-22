import 'dotenv/config';
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  {
    permissions: [{ module: 'comercial', access: 'admin' }],
    branchs: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

console.log(token);
