# Contributing to StarGazer 🔭

First off, thank you for considering contributing to StarGazer! It's people like you that make the open-source community such an incredible place to learn, inspire, and create.

StarGazer is a personal, distraction-free stargazing dashboard for beginners. We are committed to keeping the codebase as simple, fast, and beginner-friendly as the dashboard itself.

## 🤝 Code of Conduct
By participating in this project, you agree to abide by our Code of Conduct. Be respectful, be kind, and help us foster a welcoming environment for everyone—especially beginners making their first-ever open source contribution!

## 🚀 How to Contribute

### 1. Find an Issue
If you're not sure where to start, take a look at the Issues tab. We specifically tag issues that are isolated and easy to pick up with the **`good first issue`** or **`help wanted`** labels.

If you have a new idea, please open an Issue to discuss it before you start writing code!

### 2. Fork and Clone
1. Fork the repository to your own GitHub account.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/stargazer.git
   cd stargazer
   ```

### 3. Local Development Setup
StarGazer is split into a Python backend (`api/`) and a Vanilla JS frontend (`web/`).

**Running the Backend (FastAPI):**
```bash
cd api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8181 --reload
```

**Running the Frontend (Vanilla JS):**
Open a new terminal window:
```bash
cd web
python3 -m http.server 8000
```
Open `http://localhost:8000` in your browser. The frontend will automatically route API requests to your local backend.

### 4. Make Your Changes
- Create a new branch for your feature or bugfix: `git checkout -b feature/my-awesome-feature`
- Make your changes.
- Test your changes locally to ensure everything works.

### 5. Submit a Pull Request (PR)
- Commit your changes with a clear and descriptive commit message.
- Push your branch to your fork: `git push origin feature/my-awesome-feature`
- Open a Pull Request against the `main` branch of the original StarGazer repository.
- Link the Issue your PR fixes in the description (e.g., "Fixes #123").

## 🎨 Architecture Guidelines
- **Frontend:** We do not use React, Webpack, or any build steps. We use 100% Vanilla JS, HTML, and CSS. Please do not introduce npm dependencies or build tools to the `web/` folder.
- **Backend:** We use FastAPI for its speed and simplicity. 

We can't wait to review your code. Happy coding! 🌌
