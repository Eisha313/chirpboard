# Chirpboard

A lightweight micro-blogging platform designed for small communities like classrooms, clubs, or teams to share quick updates and engage through likes and follows.

## Features

- **Character-limited posts** with hashtag support and engagement metrics
- **User profiles** with customizable avatars, bios, and activity feeds
- **Like system** with animated reactions and trending post algorithm
- **Follow/unfollow system** with personalized home feed
- **Community leaderboard** showing most active and liked contributors

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/chirpboard.git
cd chirpboard

# Install dependencies
npm install
```

## Usage

```bash
# Start the server
npm start

# Development mode with auto-reload
npm run dev

# Run linting
npm run lint
```

The server runs on `http://localhost:3000` by default.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | Get all posts (supports `?trending=true`) |
| POST | `/api/posts` | Create a new post |
| POST | `/api/posts/:id/like` | Like a post |
| GET | `/api/users/:id` | Get user profile |
| POST | `/api/users/:id/follow` | Follow a user |
| GET | `/api/leaderboard` | Get community leaderboard |

## Example Requests

```bash
# Create a post
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "content": "Hello #chirpboard community!"}'

# Get trending posts
curl http://localhost:3000/api/posts?trending=true

# Like a post
curl -X POST http://localhost:3000/api/posts/post123/like \
  -H "Content-Type: application/json" \
  -d '{"userId": "user456"}'
```

## License

MIT