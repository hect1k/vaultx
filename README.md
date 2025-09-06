# VaultX

**VaultX** is a secure, scalable cloud storage platform built with **Go** (backend) and **Next.js** (frontend). It provides end-to-end encryption, searchable encrypted files, tamper-proof logging, and role-based access control (RBAC) for enterprise-grade security and auditability.

---

## Features

- **End-to-End Encrypted Storage**: All files are encrypted client-side before upload.  
- **Searchable Encryption**: Perform secure keyword searches on encrypted files without decrypting them.  
- **Tamper-Proof Logging**: Every file operation is recorded in immutable logs to prevent tampering.  
- **Role-Based Access Control**: Fine-grained permission management for users and groups.  
- **Dockerized**: Easy deployment with Docker Compose for both development and production.  

---

## Tech Stack

- **Backend**: Go, GORM, PostgreSQL  
- **Frontend**: Next.js, React, TypeScript  
- **Security**: AES-GCM encryption, Symmetric Searchable Encryption, Hash Chains for logging  
- **Containerization**: Docker, Docker Compose  

---

## Getting Started

### Prerequisites

- Docker & Docker Compose (for production)
- Go 1.24+ (for local backend dev)
- Node.js 20+ (for frontend dev)
- PostgreSQL 15+ (if running backend locally)

---

### Development

#### Backend

```bash
cd backend
go run ./cmd/server
````

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will automatically proxy `/api/*` to the backend based on `NEXT_PUBLIC_API_URL` environment variable.

---

### Production (Docker)

```bash
docker compose -f docker-compose.yml up --build -d
```

This sets up **frontend, backend, and database** with a shared network.

---

## Environment Variables

### Backend `.env`

```
DB_HOST=db
DB_PORT=5432
DB_USER=vaultx
DB_PASSWORD=vaultxpass
DB_NAME=vaultx
PORT=8080
```

### Frontend `.env`

```
NEXT_PUBLIC_API_URL=http://backend:8080
```

---

## License

VaultX is licensed under the **GPL-3.0 License**. See [LICENSE](LICENSE) for details.

---

## References & Research

* [Symmetric Searchable Encryption](https://eprint.iacr.org/2000/027.pdf)
* [AES-GCM Encryption](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
* [Role-Based Access Control Models](https://csrc.nist.gov/projects/role-based-access-control)
* [Merkle Trees for Tamper-Proof Logs](https://en.wikipedia.org/wiki/Merkle_tree)

---

## Contact

* Website: [https://nnisarg.in](https://nnisarg.in)
* Email: [contact@nnisarg.in](mailto:contact@nnisarg.in)
