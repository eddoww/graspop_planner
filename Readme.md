## Overview

Graspop Planner is a collaborative web application designed for me and my friends to plan and organize our experience at Graspop Metal Meeting 2025. The application provides a simple, user-friendly way to explore the festival lineup, rate bands, and share insights.

## Key Features

- **Multi-User Support**

  - Multiple users can use the application simultaneously
  - Easy switching between users without complex authentication
  - Designed for a small, private group of friends

- **Band Lineup Management**

  - Data scraped from official sources and enriched with additional information
  - Comprehensive band details including lineup information

- **Personal Band Tracking**
  - Rate bands on a 1-5 scale
  - Mark bands as listened to or not
  - Add personal notes about each band
  - Compare and view group insights

## Tech Stack

- **Backend**: Python with FastAPI
- **Frontend**: React
- **Database**: PostgreSQL
- **Deployment**: Docker

## Data Sources

- Official Lineup: [Graspop Metal Meeting Line-up](https://www.graspop.be/en/line-up/list)
- Additional band information scraped from various sources

## Prerequisites

- Docker
- Docker Compose
- Git

## Installation

### Clone the Repository

```bash
git clone https://github.com/yourusername/graspop-planner.git
cd graspop-planner
```

### Environment Setup

1. Create a `.env` file in the project root with the following variables:

   ```
   DATABASE_URL=postgresql://username:password@postgres:5432/graspopdb
   ```

2. Build and start the application:
   ```bash
   docker-compose up --build
   ```

### Accessing the Application

- **Frontend**: `http://localhost`
- **Backend API**: `http://localhost:3001`

## Development

### Backend (Python FastAPI)

- Located in `backend/` directory
- Import band data from a json file
- Manage band ratings and user notes

### Frontend (React)

- Located in `frontend/` directory
- User-friendly interface for band exploration
- Rating and tracking functionality

## Usage

1. Select or switch between users
2. Browse the imported band lineup
3. Rate bands from 1-5
4. Mark bands as listened to
5. Add personal notes
6. View group insights and comparisons

## Deployment

The application is containerized and can be deployed using Docker Compose. Ensure all environment variables are properly configured.

## Contributing

While this is a private project, contributions and adaptations are welcome:

- Fork the repository
- Create your feature branch (`git checkout -b feature/AmazingFeature`)
- Commit your changes (`git commit -m 'Add some AmazingFeature'`)
- Push to the branch (`git push origin feature/AmazingFeature`)
- Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Disclaimer

This application is primarily for private use among friends. It is shared openly in case others find it useful for similar purposes.

## Contact

Your Name - info@edwindejong.net

Project Link: [https://github.com/eddoww/graspop-planner](https://github.com/eddoww/graspop-planner)

## Acknowledgements

- Graspop Metal Meeting
- FastAPI
- React
- Docker
