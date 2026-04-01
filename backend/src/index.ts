import dotenv from 'dotenv';

dotenv.config();

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import invitationRoutes from './routes/invitation.routes';
import testSuitesRoutes from './routes/testsuites.routes';
import testCasesRoutes from './routes/testcases.routes';
import testPlansRoutes from './routes/testplans.routes';
import testRunsRoutes from './routes/testruns.routes';
import reportsRoutes from './routes/reports.routes';
import schedulesRoutes from './routes/schedules.routes';
import usersRoutes from './routes/users.routes';
import debugRoutes from './routes/debug.routes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log('=== Incoming Request ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Path:', req.path);
  console.log('===========================');
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/invitation', invitationRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/testsuites', testSuitesRoutes);
app.use('/api/testcases', testCasesRoutes);
app.use('/api/testplans', testPlansRoutes);
app.use('/api/testruns', testRunsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/schedules', schedulesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test Management API is running' });
});

// Only listen if not running in Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export app for Vercel serverless function
export default app;
