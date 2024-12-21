# Event Social Media Application

A microservices-based social media application for managing events, user registrations, and notifications. The application consists of two core services:

1. **User and Event Service (`api-service`)**: Handles user registration, authentication, event creation, join requests, and request management.
2. **Email Notification Service (`email-service`)**: Manages email notifications for join requests and their acceptance or rejection.

---

## Features

- **User and Event Management**: Register users, authenticate them, and allow them to create and manage events.
- **Join Requests**: Users can request to join events, with options for acceptance or rejection.
- **Email Notifications**: Sends emails for join request updates using Nodemailer.
- **Scalable Architecture**: Built with microservices, RabbitMQ for messaging, and PostgreSQL for persistence.
- **Swagger API Documentation**: Access API documentation at `/api`.

---

## Technology Stack

- **Framework**: [Nx](https://nx.dev) with [NestJS](https://nestjs.com)
- **Database**: PostgreSQL
- **Messaging**: RabbitMQ
- **Email**: Nodemailer
- **Testing**: Jest

---

## Prerequisites

Ensure the following are installed on your system:

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Nx CLI](https://nx.dev/getting-started/intro)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/AshakaE/event-socials.git
cd event-socials
```

## Setup

**Setup Environment Variables**
- **Use the provided .env.sample file to create .env files for api-service and email-service.**
- **Fill in the required values such as database credentials, RabbitMQ connection details, and email configuration.**

```bash
cp .env.sample .env
```

## Usage

- **Run microservices with docker**
```bash
docker-compose up --build -d
```

## Testing
-  **API Service test**
```bash
nx test api-service --coverage --skip-nx-cache
```
-  **Email Service test**
```bash
nx test email-service --coverage --skip-nx-cache
```