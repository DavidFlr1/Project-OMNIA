# Install npm dependencies
npm install
cd bot-agent
npm install
cd ..

# Install Python dependencies with the --only-binary flag for pydantic
cd bot-logic
pip install --only-binary=:all: pydantic
pip install -r requirements.txt --no-deps --ignore-installed pydantic
cd ..

cd fastapi-bridge
pip install --only-binary=:all: pydantic
pip install -r requirements.txt --no-deps --ignore-installed pydantic
cd ..