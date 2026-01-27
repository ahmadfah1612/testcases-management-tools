# Test Case Management Tool - Neo Brutalist Design

A bold, high-contrast test case management tool built with Neo-Brutalist design principles.

## 🎨 Neo-Brutalist Design Features

- **Bold Black Borders**: 3px solid borders on all elements
- **High Contrast Colors**: Neon green, electric blue, hot pink, yellow
- **Solid Drop Shadows**: 4px offset black shadows (no blur)
- **Sharp Corners**: No rounded corners, rectangular shapes
- **Bold Typography**: Uppercase headings with Space Grotesk font
- **Generous Spacing**: 24-32px padding between elements

## 🚀 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Base component library
- **Recharts** - Charts and visualizations
- **Lucide React** - Icons

### Backend
- **Node.js + Express** - REST API server
- **TypeScript** - Type safety
- **Prisma ORM** - Database toolkit
- **PostgreSQL** - Relational database
- **JWT + bcrypt** - Authentication & security

## ✨ Features

- ✅ User authentication (login/register)
- ✅ Test suite management (hierarchical folders)
- ✅ Test case management with versioning
- ✅ Test plan creation and management
- ✅ Test run execution
- ✅ Test result tracking (pass/fail/skip)
- ✅ Reporting and analytics dashboard
- ✅ Test scheduling with cron expressions
- ✅ Import/Export functionality
- ✅ Real-time progress tracking

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run dev
```

Backend will run on `http://localhost:3001`

### Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local if needed (API_URL is already set)

# Start development server
npm run dev
```

Frontend will run on `http://localhost:3000`

## 🗄️ Database Schema

### Tables

**Users**: id, username, email, passwordHash, createdAt

**TestSuites**: id, name, description, parentId, createdBy, createdAt, updatedAt
- Self-referencing for hierarchical folder structure

**TestCases**: id, suiteId, title, description, steps, expectedResult, status, priority, tags, version, createdBy, createdAt, updatedAt

**TestCaseVersions**: id, testCaseId, version, changes, createdBy, createdAt

**TestPlans**: id, name, description, testCaseIds, createdBy, createdAt, updatedAt

**TestPlanAssignments**: id, testCaseId, planId

**TestRuns**: id, testPlanId, name, status, startedBy, startedAt, completedAt

**TestResults**: id, testRunId, testCaseId, status, actualResult, screenshots, notes, createdBy, createdAt, updatedAt

**TestSchedules**: id, testPlanId, name, cronExpression, active, createdBy, createdAt, lastRunAt, nextRunAt

## 🎯 Usage

1. **Register**: Create an account at `/register`
2. **Login**: Access your dashboard at `/login`
3. **Create Test Suite**: Organize your test cases into folders
4. **Create Test Cases**: Write detailed test cases with steps and expected results
5. **Create Test Plans**: Select test cases to create a test plan
6. **Run Tests**: Execute test runs and track results
7. **View Reports**: Analyze test execution trends and metrics
8. **Schedule Tests**: Set up automated test runs with cron expressions

## 🎨 Neo-Brutalist Color Palette

```css
--neo-green: 57 255 20      /* Neon Green */
--neo-blue: 0 191 255        /* Electric Blue */
--neo-pink: 255 105 180      /* Hot Pink */
--neo-yellow: 255 255 0       /* Yellow */
--neo-orange: 255 107 0       /* Orange */
--neo-red: 239 68 68          /* Red */
```

## 📁 Project Structure

```
/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── utils/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── dashboard/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── neobrutalism/
│   │   │   ├── ui/
│   │   │   └── dashboard/
│   │   └── lib/
│   │       ├── api.ts
│   │       └── auth-context.tsx
│   └── package.json
└── README.md
```

## 🔒 Authentication

- JWT-based authentication
- Passwords hashed with bcrypt (10 rounds)
- Token expires in 7 days
- Protected routes require valid token

## 📊 API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Test Suites
- `GET /api/testsuites` - Get all test suites
- `POST /api/testsuites` - Create test suite
- `PUT /api/testsuites/:id` - Update test suite
- `DELETE /api/testsuites/:id` - Delete test suite

### Test Cases
- `GET /api/testcases` - Get all test cases
- `GET /api/testcases/:id` - Get test case details
- `POST /api/testcases` - Create test case
- `PUT /api/testcases/:id` - Update test case
- `DELETE /api/testcases/:id` - Delete test case

### Test Plans
- `GET /api/testplans` - Get all test plans
- `GET /api/testplans/:id` - Get test plan details
- `POST /api/testplans` - Create test plan
- `PUT /api/testplans/:id` - Update test plan
- `DELETE /api/testplans/:id` - Delete test plan

### Test Runs
- `GET /api/testruns` - Get all test runs
- `GET /api/testruns/:id` - Get test run details
- `POST /api/testruns` - Create test run
- `PUT /api/testruns/:id` - Update test run
- `DELETE /api/testruns/:id` - Delete test run
- `POST /api/testruns/:id/results` - Update test result

### Reports
- `GET /api/reports/stats` - Get dashboard statistics
- `GET /api/reports/trends` - Get test trends

### Schedules
- `GET /api/schedules` - Get all schedules
- `POST /api/schedules` - Create schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

## 🛠️ Development

### Backend
```bash
npm run dev        # Start dev server with hot reload
npm run build      # Compile TypeScript
npm run start      # Start production server
npm run prisma:studio  # Open Prisma Studio
```

### Frontend
```bash
npm run dev        # Start dev server with hot reload
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

## 🧪 Testing

To set up test data:

1. Register a new user
2. Create test suites
3. Add test cases to suites
4. Create test plans with test cases
5. Run test plans
6. Check reports and analytics

## 🚧 Roadmap

- [ ] Bulk import test cases (CSV/JSON)
- [ ] Test case templates
- [ ] Advanced filtering and search
- [ ] Test case dependencies
- [ ] Email notifications
- [ ] Team collaboration features
- [ ] Integration with CI/CD
- [ ] Advanced analytics dashboard
- [ ] Export to PDF reports
- [ ] Mobile responsive improvements

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💡 Design Philosophy

Neo-Brutalism prioritizes:
- **Function over form**
- **High readability**
- **Bold visual impact**
- **Accessibility through contrast**
- **Clear user experience**

This design creates a memorable, unique interface while maintaining excellent usability.