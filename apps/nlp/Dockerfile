# syntax=docker/dockerfile:1
# Serviço de PLN do Vacina em Dia em contêiner (host oficial do Azure Functions, Python 3.13).
#   docker build -f apps/nlp/Dockerfile apps/nlp
# A imagem oficial só existe para linux/amd64 (a mesma arquitetura do Azure).
FROM mcr.microsoft.com/azure-functions/python:4-python3.13

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

WORKDIR /home/site/wwwroot
# Dependências primeiro, para o cache só quebrar quando elas mudarem.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY host.json function_app.py ./
COPY vacina_nlp ./vacina_nlp
