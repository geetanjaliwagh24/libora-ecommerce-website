import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    env = os.environ.get('FLASK_ENV', 'production')
    port = int(os.environ.get('PORT', 5000))
    
    if env == 'development':
        app.run(host='0.0.0.0', port=port, debug=app.config.get('FLASK_DEBUG', True))
    else:
        from waitress import serve
        print(f"Starting Waitress production server on port {port}...")
        serve(app, host='0.0.0.0', port=port)
