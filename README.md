# Scallion 🧅

A fast-paced online multiplayer hot-potato category trivia game. Players scramble to answer prompts before they're chopped, with an Overcooked-style chaotic energy and rarity-based scoring.

## Tech Stack
- **Backend**: Node.js, Express, Socket.io
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (Zero build tools/dependencies)
- **Data**: JSON-based question categories

## Project Structure
```text
scallion/
├── data/questions/   # JSON files for trivia categories
├── public/            # Client-side assets (HTML, CSS, JS)
├── server/            # Server-side logic (Game engine, Socket handlers)
├── package.json       # Dependencies and start script
└── README.md
```

## Adding Custom Categories
Create a `.json` file in `data/questions/`. The file must follow this schema:

```json
{
  "category": "Example Category",
  "prompts": [
    {
      "id": "q1",
      "prompt": "The question text goes here",
      "answers": [
        { 
          "answer": "Canonical Answer", 
          "rarity": "common|uncommon|rare|deep_cut|one_in_a_krillion", 
          "aliases": ["Alternative 1", "Alternative 2"] 
        }
      ]
    }
  ]
}
```

## Running Locally
1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Start the server**:
   ```bash
   npm start
   ```
3. **Play**: Open [http://localhost:3000](http://localhost:3000) in your browser.

## Hosting Online (Free)

### Option A: Cloudflare Quick Tunnel (Instant)
1. **Install cloudflared**:
   - **Windows**: `winget install Cloudflare.cloudflared`
   - **Mac**: `brew install cloudflared`
   - *Note: If the command is not recognized, restart your terminal or add the install folder to your system PATH.*
2. **Launch Tunnel**: While the server is running, run:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
Share the generated `trycloudflare.com` URL with your friends.

### Option B: Render.com (Permanent)
1. **GitHub**: Push the project to a GitHub repository.
2. **Connect**: Log in to [Render.com](https://render.com), click **New** $\rightarrow$ **Web Service**, and connect your GitHub account.
3. **Configure**:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. **Deploy**: Click **Deploy**. Render will provide a permanent `onrender.com` URL.
