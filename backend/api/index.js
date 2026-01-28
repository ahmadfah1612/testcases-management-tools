const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import all routes
const authRoutes = require('../dist/routes/auth.routes');
const usersRoutes = require('../dist/routes/users.routes');
const testSuitesRoutes = require('../dist/routes/testsuites.routes');
const testCasesRoutes = require('../dist/routes/testcases.routes');
const testPlansRoutes = require('../dist/routes/testplans.routes');
const testRunsRoutes = require('../dist/routes/testruns.routes');
const reportsRoutes = require('../dist/routes/reports.routes');
const schedulesRoutes = require('../dist/routes/schedules.routes');

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/testsuites', testSuitesRoutes);
app.use('/api/testcases', testCasesRoutes);
app.use('/api/testplans', testPlansRoutes);
app.use('/api/testruns', testRunsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/schedules', schedulesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test Management API is running' });
});

module.exports = app;
