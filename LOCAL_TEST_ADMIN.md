# Local test admin

The audit created an isolated PostgreSQL database in Docker. It is bound to
`127.0.0.1:55432`; the existing `.env` and `.env.local` configuration was preserved.
The active account is `local-admin`, with role `admin` and status `active`.

The generated password is the `LOCAL_ADMIN_PASSWORD` value in `.env.test.local`.
That file is ignored by Git and has owner-only file permissions. No password is
stored in committed source. Log in at http://localhost:3000/login.

To start this environment again:

```sh
docker compose --env-file .env.test.local -f docker-compose.local.yml up -d --wait
pnpm db:seed-local-admin
pnpm build
pnpm dev:local
```

`db:seed-local-admin` refuses remote database URLs and production environments.
It initializes the local schema and inserts the account only when its username
does not exist. Running it again leaves the existing password unchanged.

For frontend hot reload, run `pnpm client-dev` in a second terminal and open
http://localhost:5173/login. The Vite proxy forwards API requests to port 3000.

To run database integration tests:

```sh
pnpm test:integration
```

To stop the database without deleting its data:

```sh
docker compose --env-file .env.test.local -f docker-compose.local.yml stop
```

On another machine, create an ignored `.env.test.local` with `NODE_ENV=development`,
`PORT=3000`, `CLIENT_URL=http://localhost:5173`, a random `JWT_SECRET`,
`LOCAL_ADMIN_USERNAME=local-admin`, a random `LOCAL_ADMIN_PASSWORD` of 12–72 bytes,
and a random `LOCAL_DB_PASSWORD`. Set `DATABASE_URL` to
`postgresql://propadmin:<LOCAL_DB_PASSWORD>@127.0.0.1:55432/propadmin_local`.
