# Halify.ai - AI-Powered Proposal & Business Intelligence Platform

Halify.ai is a full-stack web application that leverages AI (OpenAI GPT) and web scraping technologies to help freelancers and professionals generate intelligent proposals, verify contacts, find domain information, and scrape business data. It combines a modern React frontend with a robust FastAPI backend to provide a comprehensive toolkit for business development.

## 🎯 Project Overview

Halify.ai is designed to streamline and automate the proposal creation process for freelancers and consultants. The platform integrates multiple AI-powered tools and services to help users:

- **Generate Professional Proposals** - AI-driven proposal generation based on job requirements and GitHub portfolio
- **Scrape Business Data** - Extract business information from Google Maps
- **Verify Email Addresses** - Bulk email verification for lead generation
- **Find Company Domains** - AI-powered company domain discovery
- **Manage History** - Store and retrieve past proposals and searches
- **User Authentication** - Secure account management with session tokens

---

## ✨ Key Features

### 1. **AI-Powered Proposal Generation** 📝
- Generates professional, customized proposals using OpenAI GPT models
- Analyzes job requirements and GitHub profile
- Automatically selects 2 most relevant GitHub repositories based on job description
- Provides multiple proposal templates (3 different designs)
- Real-time preview of generated proposals
- Download proposals as PDF
- Support for different OpenAI models (gpt-4o-mini, gpt-4, etc.)

### 2. **Google Maps Business Scraper** 🗺️
- Search and scrape business data from Google Maps
- Extract business information: name, rating, reviews, address, phone, website, email
- Social media links: Facebook, Instagram, TikTok, Twitter, YouTube
- Streaming progress updates for large scraping operations
- Customizable result limits (up to configured maximum)
- Bulk data export capabilities

### 3. **Email Verification** ✉️
- Single email verification
- Bulk email verification (up to 200 emails)
- Verify email deliverability and validity
- Real-time verification feedback
- Perfect for lead validation and list cleaning

### 4. **Domain Finder** 🌐
- AI-powered company domain discovery
- Single domain lookup
- Bulk domain lookup (up to 30 companies)
- Uses OpenAI to intelligently find official company domains
- Helps with lead research and outreach preparation

### 5. **User Authentication & Account Management** 🔐
- Secure user registration and login
- Session-based authentication with Bearer tokens
- OpenAI API key management (stored securely)
- User preferences (selected AI model)
- User dashboard with account information

### 6. **History & Preferences** 💾
- Save and manage proposal history
- Track scraping operations
- Store user preferences
- Quick retrieval of past work

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS 4
- **UI Components:** Lucide React (icons), Framer Motion (animations)
- **HTTP Client:** Axios
- **State Management:** React Context API
- **Data Export:** XLSX (Excel export)

**Backend:**
- **Framework:** FastAPI (Python)
- **Server:** Uvicorn
- **Database:** SQLite (with custom schema for users, sessions, history, preferences)
- **AI Integration:** OpenAI Python SDK
- **Web Scraping:** Custom Google Maps scraper
- **Email Verification:** SMTP/Email validation service
- **PDF Generation:** Custom PDF rendering
- **CORS:** Enabled for frontend-backend communication

---

## 📁 Project Structure

```
Upwork-Proposal/
├── frontend/                    # React Frontend Application
│   ├── src/
│   │   ├── pages/              # Page components
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ProposalPage.tsx
│   │   │   ├── MapScraperPage.tsx
│   │   │   ├── EmailVerifyPage.tsx
│   │   │   ├── DomainFinderPage.tsx
│   │   │   ├── HistoryPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── SignupPage.tsx
│   │   ├── components/          # Reusable React components
│   │   │   └── Sidebar.tsx      # Main navigation sidebar
│   │   ├── context/             # React Context providers
│   │   │   ├── AuthContext.tsx
│   │   │   └── ScraperContext.tsx
│   │   ├── App.tsx              # Main App component
│   │   └── main.tsx             # Application entry point
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # FastAPI Backend Application
│   ├── main.py                  # FastAPI app and route definitions
│   ├── auth.py                  # Authentication and database logic
│   ├── halify.db                # SQLite database
│   ├── .env                     # Environment variables
│   │
│   ├── proposal/                # Proposal generation module
│   │   ├── agent.py            # GitHub repository fetcher
│   │   ├── prompts.py          # AI prompts and system messages
│   │   └── templates.py        # HTML/PDF templates for proposals
│   │
│   ├── maps/                    # Google Maps scraping module
│   │   └── scraper.py          # Maps scraping logic
│   │
│   ├── emailverify/             # Email verification module
│   │   └── verifier.py         # Email verification logic
│   │
│   ├── domainfinder/            # Domain finder module
│   │   └── finder.py           # AI-powered domain lookup
│   │
│   └── templates/               # HTML templates and static files
│       ├── index.html
│       └── static/
│
├── package.json                 # Root npm configuration (for concurrently)
└── README.md                    # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or higher) - for frontend
- **Python** (v3.8 or higher) - for backend
- **npm** or **yarn** - package manager
- **OpenAI API Key** - for AI-powered features
- **Git** - for version control

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/alihassanml/Upwork-Proposal.git
cd Upwork-Proposal
```

#### 2. Install Root Dependencies
```bash
npm install
```
This installs `concurrently` which allows running both frontend and backend with a single command.

#### 3. Frontend Setup
```bash
cd frontend
npm install
cd ..
```

#### 4. Backend Setup
```bash
cd backend
pip install -r requirements.txt  # Create requirements.txt if not present
# Or install dependencies manually:
pip install fastapi uvicorn openai python-dotenv pydantic jinja2 aiosqlite openpyxl
cd ..
```

#### 5. Environment Configuration

Create a `.env` file in the `backend` directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=sqlite:///halify.db
JWT_SECRET=your_secret_key_here
```

### Running the Application

#### Option 1: Run Both Projects Together (Recommended)
```bash
npm run dev
```
This starts:
- **Frontend:** http://localhost:5173 (Vite dev server)
- **Backend:** http://localhost:8000 (FastAPI server)

#### Option 2: Run Frontend Only
```bash
npm run frontend
```

#### Option 3: Run Backend Only
```bash
npm run backend
```

#### Option 4: Manual Startup
```bash
# Terminal 1 - Frontend
cd frontend && npm run dev

# Terminal 2 - Backend
cd backend && python main.py
```

---

## 🔌 API Endpoints

### Authentication
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /logout` - Logout user
- `GET /me` - Get current user info
- `POST /update-api-key` - Update OpenAI API key

### Proposal Generation
- `POST /generate` - Generate AI proposal
- `GET /preview/{template}` - Preview proposal template
- `POST /render-preview` - Render proposal preview
- `POST /download-pdf` - Download proposal as PDF

### Google Maps Scraping
- `GET /scrape-maps/stream` - Stream scraping with progress
- `POST /scrape-maps` - Scrape and return all results

### Email Verification
- `GET /email/verify?email=...` - Verify single email
- `POST /email/verify/bulk` - Verify multiple emails

### Domain Finder
- `POST /find-domain` - Find domain for single company
- `POST /find-domain/bulk` - Find domains for multiple companies

### User Data
- `GET /history` - Get user's history
- `POST /history` - Save history entry
- `DELETE /history/{id}` - Delete history entry
- `GET /preferences` - Get user preferences
- `POST /preferences` - Save user preferences

---

## 🔐 Authentication

The application uses **Bearer Token Authentication**:

1. User registers or logs in
2. Server returns a JWT-like session token
3. Token is stored in localStorage (frontend)
4. Token is sent in `Authorization: Bearer <token>` header for authenticated requests
5. Backend validates token and retrieves user information

---

## 💾 Database Schema

### Users Table
- `id` - User ID (primary key)
- `name` - User full name
- `email` - User email (unique)
- `password_hash` - Hashed password
- `openai_api_key` - Encrypted OpenAI API key
- `created_at` - Account creation timestamp

### Sessions Table
- `id` - Session ID
- `user_id` - Foreign key to users
- `token` - Session token
- `expires_at` - Token expiration time

### History Table
- `id` - History entry ID
- `user_id` - Foreign key to users
- `type` - Type of entry (proposal, scrape, etc.)
- `title` - Entry title
- `summary` - Brief summary
- `data` - Full data (JSON)
- `created_at` - Creation timestamp

### Preferences Table
- `id` - Preference ID
- `user_id` - Foreign key to users
- `model` - Selected AI model (gpt-4o-mini, gpt-4, etc.)
- `other_settings` - Additional preferences (JSON)

---

## 🎨 Frontend Features

### Responsive Design
- Mobile-friendly interface using Tailwind CSS
- Sidebar navigation for easy access
- Responsive grid layouts

### State Management
- **AuthContext** - User authentication state
- **ScraperContext** - Scraping operation state
- Real-time updates and progress tracking

### User Experience
- Loading indicators and spinners
- Error handling and user feedback
- Smooth animations with Framer Motion
- Toast notifications for actions
- Auto-saving of user preferences

---

## 🔄 Workflow Examples

### Proposal Generation Workflow
1. User navigates to Proposal tab
2. Enters job requirements, GitHub URL, timeline
3. Selects proposal template
4. Clicks "Generate" button
5. Backend fetches relevant repos from GitHub
6. AI generates proposal based on requirements and repos
7. User sees real-time preview
8. Can download as PDF or make adjustments
9. History is saved automatically

### Email Verification Workflow
1. User navigates to Email Verify tab
2. Enters single email or uploads list of emails
3. Clicks "Verify" button
4. Backend verifies each email address
5. Results show delivery status
6. Can export verified emails as CSV/Excel

### Maps Scraping Workflow
1. User navigates to Maps Scraper tab
2. Enters search query (e.g., "restaurants in New York")
3. Sets maximum results
4. Clicks "Scrape" button
5. Backend scrapes Google Maps with progress updates
6. Results are displayed in real-time
7. Can export data as Excel file

---

## 🛠️ Development

### Building for Production

**Frontend Build:**
```bash
cd frontend && npm run build
```
Outputs optimized files to `frontend/dist/`

**Backend Production:**
```bash
cd backend && python main.py
```
Or deploy with Gunicorn:
```bash
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

### Running Tests
```bash
cd frontend && npm run lint
```

### Code Style
- Frontend uses ESLint with TypeScript support
- Backend follows PEP 8 Python conventions

---

## 🔒 Security Considerations

- OpenAI API keys are stored securely in the database
- Passwords are hashed using bcrypt
- Session tokens are used for authentication
- CORS is enabled for frontend-backend communication
- Input validation on both frontend and backend
- Environment variables for sensitive data

---

## 📊 Features in Detail

### Proposal Generation
- **AI Models:** Support for multiple OpenAI models
- **Repository Analysis:** Automatically analyzes GitHub repos
- **Multiple Templates:** 3 different proposal design templates
- **PDF Export:** Professional PDF download
- **Customizable:** Users can edit generated content

### Business Intelligence
- **Maps Scraping:** Extract competitor and business data
- **Email Validation:** Ensure lead list quality
- **Domain Discovery:** Find company contact information
- **Bulk Operations:** Process multiple items efficiently

---

## 🐛 Troubleshooting

### Issue: OpenAI API Key not working
**Solution:** 
- Verify API key is valid on OpenAI dashboard
- Ensure API key has sufficient credits
- Check .env file configuration

### Issue: Database locked error
**Solution:**
- Close other instances of the app
- Delete old database connections
- Restart the backend

### Issue: CORS errors
**Solution:**
- Verify frontend and backend are running
- Check CORS middleware is configured in main.py
- Ensure correct API URLs in frontend

---

## 📝 License

This project is created for Upwork proposals and freelance work.

---

## 👤 Author

**Ali Hassan** - AI/ML Developer & Freelancer
- GitHub: [@alihassanml](https://github.com/alihassanml)
- Upwork: [Profile](https://www.upwork.com/)

---

## 🚀 Future Enhancements

- [ ] Support for additional AI models
- [ ] Advanced filtering in Maps scraper
- [ ] Team collaboration features
- [ ] API rate limiting and usage analytics
- [ ] Custom proposal templates upload
- [ ] Email campaign integration
- [ ] LinkedIn profile scraping
- [ ] Advanced reporting dashboard

---

## 📧 Support & Contact

For issues, questions, or feature requests, please reach out through:
- GitHub Issues
- Email: [contact info]
- Upwork Messages

---

**Last Updated:** May 2026
**Version:** 1.0.0
