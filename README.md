# GritScore - AI-Powered Credit Analysis & Financial Coaching Platform

GritScore is a comprehensive web application that combines AI-powered credit analysis, financial coaching, and automated dispute letter generation to help users improve their credit scores and financial health.

## 🚀 Features

### Core Features
- **AI-Powered Credit Analysis**: Upload credit reports and get detailed AI analysis
- **Credit Score Simulation**: Simulate how different actions affect your credit score
- **Automated Dispute Letters**: Generate professional dispute letters for credit report errors
- **Financial Budgeting**: Track expenses, income, and create budgets
- **Debt Management**: Monitor and track debt payments
- **AI Chat Assistant**: Get personalized financial advice and coaching
- **Subscription Management**: Premium features with Stripe integration

### Technical Features
- **Full-Stack Application**: React frontend with Flask backend
- **Real-time Updates**: WebSocket integration for live data
- **Secure Authentication**: JWT-based authentication with Supabase
- **Payment Processing**: Stripe integration for subscriptions
- **File Upload**: Secure document upload and processing
- **PDF Generation**: Automated PDF report generation
- **Responsive Design**: Mobile-friendly interface

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite
- **Tailwind CSS** for styling
- **React Query** for state management
- **React Router** for navigation
- **Framer Motion** for animations
- **Heroicons** for icons

### Backend
- **Flask** web framework
- **Supabase** for database and authentication
- **OpenAI GPT-4** for AI analysis
- **Stripe** for payment processing
- **Mailjet** for email services
- **SQLAlchemy** for database ORM

### Development Tools
- **Vite** for frontend build tooling
- **ESLint** for code linting
- **Vitest** for testing
- **PostCSS** and **Autoprefixer**

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v18 or higher)
- **Python** (v3.11 or higher)
- **Git**
- **Supabase** account and project
- **OpenAI** API key
- **Stripe** account and API keys
- **Mailjet** account (optional, for email features)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd gritscore-main
```

### 2. Set Up Environment Variables
Copy the example environment file and configure your variables:
```bash
cp env.example .env
```

Edit `.env` with your actual API keys and configuration:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Flask Configuration
FLASK_SECRET_KEY=your_flask_secret_key
JWT_SECRET_KEY=your_jwt_secret_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Application Configuration
APP_URL=http://127.0.0.1:5000

# Email Configuration (Mailjet)
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_API_SECRET=your_mailjet_api_secret
```

### 3. Install Dependencies

#### Frontend Dependencies
```bash
npm install
```

#### Backend Dependencies
```bash
pip install -r requirements.txt
```

### 4. Set Up Database
```bash
# Run database migrations
python migrate.py
```

### 5. Start the Application

#### Development Mode
```bash
# Terminal 1: Start backend server
python app.py

# Terminal 2: Start frontend development server
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173 (or next available port)
- Backend API: http://localhost:5000

## 🏗️ Project Structure

```
gritscore-main/
├── src/                    # Frontend React application
│   ├── components/        # Reusable React components
│   ├── pages/            # Page components
│   ├── contexts/         # React contexts
│   ├── services/         # API services
│   └── api/              # Backend API modules
├── static/               # Static assets
├── templates/            # HTML templates
├── uploads/              # File upload directory
├── migrations/           # Database migrations
├── requirements.txt      # Python dependencies
├── package.json          # Node.js dependencies
└── app.py               # Main Flask application
```

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Set up authentication policies
3. Configure RLS (Row Level Security)
4. Add your Supabase URL and keys to `.env`

### Stripe Setup
1. Create a Stripe account
2. Get your API keys from the dashboard
3. Configure webhook endpoints
4. Add keys to `.env`

### OpenAI Setup
1. Get an OpenAI API key
2. Add to `.env` file
3. Ensure sufficient credits for API usage

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)
```bash
# Build the frontend
npm run build

# Deploy the dist/ folder
```

### Backend Deployment (Heroku/Railway)
```bash
# Ensure Procfile is present
# Deploy using your preferred platform
```

### Environment Variables for Production
Make sure to set all environment variables in your production environment:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`

## 🧪 Testing

### Frontend Tests
```bash
npm test
```

### Backend Tests
```bash
# Run individual test files
python test_auth.py
python test_supabase.py
```

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Credit Analysis Endpoints
- `POST /api/crdt/upload` - Upload credit report
- `GET /api/crdt/analysis` - Get analysis results
- `POST /api/crdt/analyze` - Analyze credit report

### Disputes Endpoints
- `GET /api/disputes/` - Get user disputes
- `POST /api/disputes/` - Create new dispute
- `POST /api/disputes/<id>/letter` - Generate dispute letter

### Subscription Endpoints
- `GET /api/subscription/plans` - Get available plans
- `POST /api/subscription/checkout` - Create checkout session
- `POST /api/subscription/webhook` - Stripe webhook handler

## 🔒 Security

- JWT-based authentication
- Row Level Security (RLS) in Supabase
- Environment variable protection
- Input validation and sanitization
- CORS configuration
- Rate limiting (recommended for production)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the setup guides

## 🔄 Updates

Stay updated with the latest changes by:
- Following the repository
- Checking the releases page
- Reading the changelog

---

**Note**: This is a development version. For production use, ensure all security measures are properly configured and tested.
# gritscore
# gritt
