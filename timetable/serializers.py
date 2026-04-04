from rest_framework import serializers
from .models import Department, LectureHall, Lecturer, LecturerUnavailability, Course, TimeSlot, TimetableEntry

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class LectureHallSerializer(serializers.ModelSerializer):
    class Meta:
        model = LectureHall
        fields = '__all__'

class LecturerUnavailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = LecturerUnavailability
        fields = ['id', 'day']

class LecturerSerializer(serializers.ModelSerializer):
    unavailable_days = LecturerUnavailabilitySerializer(many=True, read_only=True)
    unavailable_days_input = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Lecturer
        fields = ['id', 'first_name', 'last_name', 'staff_id', 'department', 'email', 'unavailable_days', 'unavailable_days_input']

    def create(self, validated_data):
        days_data = validated_data.pop('unavailable_days_input', [])
        lecturer = Lecturer.objects.create(**validated_data)
        for day in days_data:
            LecturerUnavailability.objects.create(lecturer=lecturer, day=day)
        return lecturer
        
    def update(self, instance, validated_data):
        days_data = validated_data.pop('unavailable_days_input', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if days_data is not None:
            LecturerUnavailability.objects.filter(lecturer=instance).delete()
            for day in days_data:
                LecturerUnavailability.objects.create(lecturer=instance, day=day)
                
        return instance

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = '__all__'

class TimeSlotSerializer(serializers.ModelSerializer):
    start_time_display = serializers.ReadOnlyField()
    end_time_display = serializers.ReadOnlyField()
    duration = serializers.ReadOnlyField()

    class Meta:
        model = TimeSlot
        fields = '__all__'

class TimetableEntrySerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    lecturer = LecturerSerializer(read_only=True)
    hall = LectureHallSerializer(read_only=True)
    time_slot = TimeSlotSerializer(read_only=True)

    class Meta:
        model = TimetableEntry
        fields = '__all__'
