# Bmedical Frontend

Frontend i platformes eshte i ndertuar me React, TypeScript dhe Vite.

## Konfigurimi

Krijo nje skedar `.env` bazuar te `.env.example` dhe vendos endpoint-in e backend-it PostgreSQL:

```env
VITE_API_ENDPOINT=http://localhost:4000/api/physio
VITE_API_TOKEN=
```

Ky projekt perdor nje shtrese autentikimi dhe nje API backend-i te personalizuar qe menaxhon tenant-et dhe operacionet mbi PostgreSQL.
