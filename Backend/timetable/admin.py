from django.contrib import admin
from .models import (
    College, Department, LectureHall, Lecturer,
    LecturerUnavailability, Course, TimeSlot, TimetableEntry
)


@admin.register(College)
class CollegeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code']
    search_fields = ['name', 'code']


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'college']
    search_fields = ['name', 'code']
    list_filter = ['college']


@admin.register(LectureHall)
class LectureHallAdmin(admin.ModelAdmin):
    list_display = ['name', 'capacity', 'hall_type']
    list_filter = ['hall_type']
    filter_horizontal = ['colleges']


class UnavailabilityInline(admin.TabularInline):
    model = LecturerUnavailability
    extra = 1


@admin.register(Lecturer)
class LecturerAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'staff_id', 'college']
    list_filter = ['college']
    search_fields = ['first_name', 'last_name', 'staff_id']
    inlines = [UnavailabilityInline]


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'department', 'level', 'course_type', 'units', 'student_count', 'lecturer']
    list_filter = ['department', 'level', 'course_type', 'units']
    search_fields = ['name', 'code']
    filter_horizontal = ['shared_departments']


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = ['day', 'start_hour', 'end_hour']
    list_filter = ['day']


@admin.register(TimetableEntry)
class TimetableEntryAdmin(admin.ModelAdmin):
    list_display = ['course', 'lecturer', 'hall', 'time_slot']
    list_filter = ['time_slot__day', 'hall', 'course__department']
