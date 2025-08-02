import os
import sys
import subprocess

def parse_args():
    """Parse command line arguments like botName=Bob subPort=1"""
    params = {}
    for arg in sys.argv[1:]:
        if '=' in arg:
            key, value = arg.split('=', 1)
            params[key] = value
    return params

def main():
    params = parse_args()
    
    # Get subPort from args, env, or default
    subport = int(params.get('subPort', os.environ.get('SUBPORT', '1')))
    port = 4000 + subport
    
    print(f"Starting Bot Logic Service on port {port}")
    if 'botName' in params:
        print(f"Associated with bot: {params['botName']}")
    
    cmd = [
        sys.executable, '-m', 'uvicorn', 
        'main:app', '--reload', 
        '--host', '0.0.0.0', 
        '--port', str(port)
    ]
    
    subprocess.run(cmd)

if __name__ == "__main__":
    main()