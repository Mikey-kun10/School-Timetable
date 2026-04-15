import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_timetable.settings')
django.setup()

from timetable.models import College, LectureHall
from timetable.serializers import LectureHallSerializer
from rest_framework.exceptions import ValidationError

def test_hall_uniqueness():
    print("Running Hall Uniqueness Tests...")
    
    # 1. Setup
    c1, _ = College.objects.get_or_create(code="C1", name="College 1")
    c2, _ = College.objects.get_or_create(code="C2", name="College 2")
    
    # Clean up existing halls named 'Test Hall'
    LectureHall.objects.filter(name__iexact="Test Hall").delete()
    
    # 2. Create a hall for C1
    h1 = LectureHall.objects.create(name="Test Hall", capacity=50, hall_type="college")
    h1.colleges.add(c1)
    print("Created 'Test Hall' for College 1")
    
    # 3. Try to create another 'Test Hall' for C1 (Should fail)
    data = {
        "name": "Test Hall",
        "capacity": 60,
        "hall_type": "college",
        "colleges": [c1.id]
    }
    serializer = LectureHallSerializer(data=data)
    try:
        serializer.is_valid(raise_exception=True)
        print("FAIL: Second 'Test Hall' for C1 should have failed validation")
    except ValidationError as e:
        print(f"SUCCESS: Caught expected validation error: {e}")
    
    # 4. Try to create 'Test Hall' for C2 (Should pass)
    data["colleges"] = [c2.id]
    serializer = LectureHallSerializer(data=data)
    if serializer.is_valid():
        h2 = serializer.save()
        print("SUCCESS: 'Test Hall' for College 2 created (allowed because different college)")
    else:
        print(f"FAIL: 'Test Hall' for C2 should have passed. Errors: {serializer.errors}")

    # 5. Try to create a 'general' hall named 'Test Hall' (Should fail)
    data = {
        "name": "Test Hall",
        "capacity": 100,
        "hall_type": "general",
        "colleges": []
    }
    serializer = LectureHallSerializer(data=data)
    try:
        serializer.is_valid(raise_exception=True)
        print("FAIL: General hall with existing name should have failed")
    except ValidationError as e:
        print(f"SUCCESS: Caught expected validation error for general hall: {e}")

    print("\nTests completed.")

if __name__ == "__main__":
    test_hall_uniqueness()
