from rest_framework import serializers
from .models import College, Department, LectureHall, Lecturer, LecturerUnavailability, Course, TimeSlot, TimetableEntry

class CollegeSerializer(serializers.ModelSerializer):
    class Meta:
        model = College
        fields = '__all__'

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class LectureHallSerializer(serializers.ModelSerializer):
    class Meta:
        model = LectureHall
        fields = '__all__'

    def validate(self, data):
        hall_type = data.get('hall_type')
        colleges = data.get('colleges', [])
        name = data.get('name')
        
        if hall_type != 'general' and not colleges:
            raise serializers.ValidationError({
                "colleges": "At least one college must be assigned to this hall type."
            })

        if name:
            from django.db.models import Q
            
            # 1. Any 'general' hall with the same name exists?
            general_conflict = LectureHall.objects.filter(name__iexact=name, hall_type='general')
            if self.instance:
                general_conflict = general_conflict.exclude(id=self.instance.id)
            
            if general_conflict.exists():
                raise serializers.ValidationError({
                    "name": f"A general purpose hall with the name '{name}' already exists."
                })

            # 2. If this is a general hall, ensure NO other hall with same name exists
            if hall_type == 'general':
                other_conflict = LectureHall.objects.filter(name__iexact=name)
                if self.instance:
                    other_conflict = other_conflict.exclude(id=self.instance.id)
                if other_conflict.exists():
                    raise serializers.ValidationError({
                        "name": f"A hall named '{name}' already exists. General halls must have unique names globally."
                    })

            # 3. If specific colleges are assigned, check those colleges for name conflict
            if colleges:
                # Handle both primary key lists and object lists (depending on serializer context)
                college_conflict = LectureHall.objects.filter(
                    name__iexact=name,
                    colleges__in=colleges
                ).distinct()
                if self.instance:
                    college_conflict = college_conflict.exclude(id=self.instance.id)
                
                if college_conflict.exists():
                    raise serializers.ValidationError({
                        "name": f"A hall named '{name}' is already assigned to one of the selected colleges."
                    })

        return data

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
        fields = ['id', 'first_name', 'last_name', 'staff_id', 'college', 'email', 'unavailable_days', 'unavailable_days_input']

    def validate_unavailable_days_input(self, value):
        from .models import DAYS_OF_WEEK
        if len(value) >= len(DAYS_OF_WEEK):
            raise serializers.ValidationError("A lecturer must be available for at least one day.")
        return value

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

    def validate(self, data):
        course_type = data.get('course_type')
        department = data.get('department')
        lecturer = data.get('lecturer')

        if not lecturer:
            raise serializers.ValidationError({"lecturer": "Lecturer is required for all courses."})
        
        if not course_type:
             raise serializers.ValidationError({"course_type": "Course type is required."})

        if course_type in ['departmental', 'shared'] and not department:
            raise serializers.ValidationError({
                "department": f"A primary department is required for {course_type} courses."
            })
        
        return data

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
