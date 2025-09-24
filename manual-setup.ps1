# Install npm dependencies
cd bot-agent
npm install
cd ..

# Install Python dependencies with the --only-binary flag for pydantic
cd bot-logic
pip install --only-binary=:all: pydantic
pip install -r requirements.txt --no-deps --ignore-installed pydantic
cd ..

cd governor
pip install --only-binary=:all: pydantic
pip install -r requirements.txt --no-deps --ignore-installed pydantic
cd ..

# build storage service
cd storage-service
docker compose build
cd ..

# build server
cd minecraft-server
docker compose build
cd ..

# start redis
docker run -d -p 6379:6379 redis

# start server
cd minecraft-server
docker compose up -d
cd ..

# start storage service
cd storage-service
docker compose up -d
cd ..

# start governor
cd governor
python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 &
cd ..

# start bot agent & logic
cd bot-agent
npm run dev:combined botName=MinecraftBot subPort=1 env=local