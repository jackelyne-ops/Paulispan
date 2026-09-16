# Paulispan ERP — Auth Testing Playbook

## Credentials
- Admin: `admin@paulispan.com.br` / `admin123`

## Curl checks
```
curl -c cookies.txt -X POST $REACT_APP_BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@paulispan.com.br","password":"admin123"}'
curl -b cookies.txt $REACT_APP_BACKEND_URL/api/auth/me
```

## Verify
- bcrypt hash starts with `$2b$`
- httpOnly `access_token` and `refresh_token` cookies set on login
- Brute force lockout after 5 failed attempts for 15 minutes
- Admin seeded idempotently on startup; password auto-updates if env changes
