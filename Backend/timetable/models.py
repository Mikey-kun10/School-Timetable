from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


DAYS_OF_WEEK = [
    ('Monday', 'Monday'),
    ('Tuesday', 'Tuesday'),
    ('Wednesday', 'Wednesday'),
    ('Thursday', 'Thursday'),
    ('Friday', 'Friday'),
]

LEVEL_CHOICES = [
    (100, '100 Level'),
    (200, '200 Level'),
    (300, '300 Level'),
    (400, '400 Level'),
    (500, '500 Level'),
]

HALL_TYPE_CHOICES = [
    ('department', 'Department-Specific'),
    ('shared', 'Shared (Multiple Departments)'),
    ('general', 'General (All Departments)'),
]

COURSE_TYPE_CHOICES = [
    ('departmental', 'Departmental (Single Department)'),
    ('shared', 'Shared (Specific Departments)'),
    ('general', 'General (All Departments)'),
]


class Department(models.Model):
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

    class Meta:
        ordering = ['name']


class LectureHall(models.Model):
    name = models.CharField(max_length=200, unique=True)
    capacity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Maximum number of students the hall can hold"
    )
    hall_type = models.CharField(
        max_length=20,
        choices=HALL_TYPE_CHOICES,
        default='department',
    )
    departments = models.ManyToManyField(
        Department,
        blank=True,
        related_name='lecture_halls',
        help_text="Departments that can use this hall (for department-specific or shared halls)"
    )

    def __str__(self):
        return f"{self.name} (Cap: {self.capacity})"

    class Meta:
        ordering = ['name']


class Lecturer(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    staff_id = models.CharField(max_length=50, unique=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='lecturers'
    )
    email = models.EmailField(blank=True, null=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    class Meta:
        ordering = ['last_name', 'first_name']


class LecturerUnavailability(models.Model):
    lecturer = models.ForeignKey(
        Lecturer, on_delete=models.CASCADE, related_name='unavailable_days'
    )
    day = models.CharField(max_length=10, choices=DAYS_OF_WEEK)

    class Meta:
        unique_together = ('lecturer', 'day')
        verbose_name_plural = "Lecturer Unavailabilities"

    def __str__(self):
        return f"{self.lecturer} - Unavailable on {self.day}"


class Course(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='courses',
        help_text="Primary/owning department"
    )
    level = models.PositiveIntegerField(
        choices=LEVEL_CHOICES,
        default=100,
        help_text="Student level for this course"
    )
    course_type = models.CharField(
        max_length=20,
        choices=COURSE_TYPE_CHOICES,
        default='departmental',
        help_text="Whether this course is for one department, shared, or general"
    )
    shared_departments = models.ManyToManyField(
        Department,
        blank=True,
        related_name='shared_courses',
        help_text="Other departments that also take this course (for shared/general courses)"
    )
    units = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(6)],
        help_text="Number of course units (1-6)"
    )
    hours = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        default=2,
        help_text="Total weekly lecture hours"
    )
    student_count = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Total expected number of students (across all departments if shared)"
    )
    lecturer = models.ForeignKey(
        Lecturer,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='courses',
        help_text="Lecturer assigned to teach this course"
    )
    shared_session_id = models.CharField(
        max_length=50,
        blank=True, null=True,
        help_text="Identifier for courses that should be taught in the same session (cross-listed)"
    )

    def get_session_durations(self):
        """Return list of session durations needed per week based on hours."""
        if self.hours <= 1:
            return [1]
        elif self.hours == 2:
            return [2]
        else:
            sessions = []
            remaining = self.hours
            while remaining > 0:
                if remaining >= 2:
                    sessions.append(2)
                    remaining -= 2
                else:
                    sessions.append(1)
                    remaining -= 1
            return sessions

    def get_all_departments(self):
        """Get all departments that take this course."""
        if self.course_type == 'general':
            return Department.objects.all()
        elif self.course_type == 'shared':
            dept_ids = list(self.shared_departments.values_list('id', flat=True))
            dept_ids.append(self.department_id)
            return Department.objects.filter(id__in=dept_ids)
        else:
            return Department.objects.filter(id=self.department_id)

    def __str__(self):
        return f"{self.code} - {self.name}"

    class Meta:
        ordering = ['code']


class TimeSlot(models.Model):
    day = models.CharField(max_length=10, choices=DAYS_OF_WEEK)
    start_hour = models.PositiveIntegerField(
        validators=[MinValueValidator(8), MaxValueValidator(17)]
    )
    end_hour = models.PositiveIntegerField(
        validators=[MinValueValidator(9), MaxValueValidator(18)]
    )

    @property
    def duration(self):
        return self.end_hour - self.start_hour

    @property
    def start_time_display(self):
        h = self.start_hour
        return f"{h}:00 AM" if h < 12 else ("12:00 PM" if h == 12 else f"{h-12}:00 PM")

    @property
    def end_time_display(self):
        h = self.end_hour
        return f"{h}:00 AM" if h < 12 else ("12:00 PM" if h == 12 else f"{h-12}:00 PM")

    def __str__(self):
        return f"{self.day} {self.start_time_display} - {self.end_time_display}"

    class Meta:
        unique_together = ('day', 'start_hour', 'end_hour')
        ordering = ['day', 'start_hour']


class TimetableEntry(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='timetable_entries')
    lecturer = models.ForeignKey(Lecturer, on_delete=models.CASCADE, related_name='timetable_entries')
    hall = models.ForeignKey(LectureHall, on_delete=models.CASCADE, related_name='timetable_entries')
    time_slot = models.ForeignKey(TimeSlot, on_delete=models.CASCADE, related_name='timetable_entries')
    session_number = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.course.code} | {self.hall.name} | {self.time_slot}"

    class Meta:
        ordering = ['time_slot__day', 'time_slot__start_hour']
