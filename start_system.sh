#!/bin/bash

# Network Automation System Startup Script
echo "🚀 Starting Network Automation System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_warning "Virtual environment not found. Creating one..."
    python3 -m venv venv
    print_status "Virtual environment created."
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
print_status "Installing dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    cp .env .env.backup 2>/dev/null || true
    print_status "Please configure your .env file with proper settings."
fi

# Run migrations
print_status "Running database migrations..."
python manage.py makemigrations
python manage.py migrate

# Create superuser if needed
print_status "Checking for superuser..."
python manage.py shell -c "
from django.contrib.auth.models import User;
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists.')
"

# Start Redis (if available)
print_status "Checking Redis availability..."
if command -v redis-server &> /dev/null; then
    print_status "Starting Redis server..."
    redis-server --daemonize yes
    print_status "Redis server started."
else
    print_warning "Redis not found. Please install Redis or use a hosted Redis service."
fi

# Function to start services
start_celery() {
    print_status "Starting Celery worker..."
    celery -A network_automation worker --loglevel=info &
    CELERY_PID=$!
    echo $CELERY_PID > celery.pid
    print_status "Celery worker started (PID: $CELERY_PID)"
}

start_beat() {
    print_status "Starting Celery beat scheduler..."
    celery -A network_automation beat --loglevel=info &
    BEAT_PID=$!
    echo $BEAT_PID > beat.pid
    print_status "Celery beat started (PID: $BEAT_PID)"
}

start_daphne() {
    print_status "Starting Daphne ASGI server..."
    daphne -b 0.0.0.0 -p 8000 network_automation.asgi:application &
    DAPHNE_PID=$!
    echo $DAPHNE_PID > daphne.pid
    print_status "Daphne ASGI server started (PID: $DAPHNE_PID)"
}

start_runserver() {
    print_status "Starting Django development server..."
    python manage.py runserver 0.0.0.0:8000
}

# Menu system
show_menu() {
    print_header "Network Automation System Control"
    echo "1. Start Django Development Server"
    echo "2. Start with Celery (Background Tasks)"
    echo "3. Start Full Stack (Daphne + Celery + Beat)"
    echo "4. Stop All Services"
    echo "5. Run Tests"
    echo "6. Open Admin Panel"
    echo "7. Show System Status"
    echo "8. Exit"
    echo ""
}

stop_all() {
    print_status "Stopping all services..."
    
    # Stop Celery worker
    if [ -f celery.pid ]; then
        kill $(cat celery.pid) 2>/dev/null || true
        rm celery.pid
        print_status "Celery worker stopped."
    fi
    
    # Stop Celery beat
    if [ -f beat.pid ]; then
        kill $(cat beat.pid) 2>/dev/null || true
        rm beat.pid
        print_status "Celery beat stopped."
    fi
    
    # Stop Daphne
    if [ -f daphne.pid ]; then
        kill $(cat daphne.pid) 2>/dev/null || true
        rm daphne.pid
        print_status "Daphne server stopped."
    fi
    
    # Stop Redis
    if command -v redis-cli &> /dev/null; then
        redis-cli shutdown 2>/dev/null || true
        print_status "Redis server stopped."
    fi
    
    print_status "All services stopped."
}

show_status() {
    print_header "System Status"
    
    # Check Redis
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping &> /dev/null; then
            print_status "Redis: Running"
        else
            print_warning "Redis: Not responding"
        fi
    else
        print_warning "Redis: Not installed"
    fi
    
    # Check Celery worker
    if [ -f celery.pid ] && kill -0 $(cat celery.pid) 2>/dev/null; then
        print_status "Celery Worker: Running (PID: $(cat celery.pid))"
    else
        print_warning "Celery Worker: Not running"
    fi
    
    # Check Celery beat
    if [ -f beat.pid ] && kill -0 $(cat beat.pid) 2>/dev/null; then
        print_status "Celery Beat: Running (PID: $(cat beat.pid))"
    else
        print_warning "Celery Beat: Not running"
    fi
    
    # Check Daphne
    if [ -f daphne.pid ] && kill -0 $(cat daphne.pid) 2>/dev/null; then
        print_status "Daphne ASGI: Running (PID: $(cat daphne.pid))"
    else
        print_warning "Daphne ASGI: Not running"
    fi
    
    # Check Django
    if curl -s http://localhost:8000 > /dev/null 2>&1; then
        print_status "Django Server: Responding"
    else
        print_warning "Django Server: Not responding"
    fi
}

# Main menu loop
while true; do
    show_menu
    read -p "Select an option (1-8): " choice
    
    case $choice in
        1)
            start_runserver
            ;;
        2)
            start_celery
            start_runserver
            ;;
        3)
            start_celery
            start_beat
            start_daphne
            print_status "Full stack started! Access the application at http://localhost:8000"
            ;;
        4)
            stop_all
            ;;
        5)
            print_status "Running tests..."
            python manage.py test
            ;;
        6)
            print_status "Opening admin panel..."
            if command -v open &> /dev/null; then
                open http://localhost:8000/admin/
            elif command -v xdg-open &> /dev/null; then
                xdg-open http://localhost:8000/admin/
            else
                print_status "Please visit http://localhost:8000/admin/ in your browser"
            fi
            ;;
        7)
            show_status
            ;;
        8)
            print_status "Stopping all services and exiting..."
            stop_all
            deactivate
            exit 0
            ;;
        *)
            print_error "Invalid option. Please try again."
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done