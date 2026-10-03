# Dockerfile para publicar no EasyPanel / Hostinger VPS
FROM python:3.12-alpine

WORKDIR /app

# Otimização e timezone
ENV PYTHONUNBUFFERED=1
ENV PORT=8085

# Copia os arquivos da aplicação
COPY server.py ./
COPY keys.json ./
COPY index.html ./
COPY styles.css ./
COPY app.js ./

# Expõe a porta do Gateway & Dashboard
EXPOSE 8085

# Inicia o servidor
CMD ["python", "server.py"]
