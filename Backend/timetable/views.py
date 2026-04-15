from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q
import pandas as pd
from .models import (
    College, Department, LectureHall, Lecturer, Course,
    TimeSlot, TimetableEntry, LEVEL_CHOICES
)
from .serializers import (
    CollegeSerializer, DepartmentSerializer, LectureHallSerializer, LecturerSerializer,
    CourseSerializer, TimetableEntrySerializer
)
from .scheduler import generate_timetable

class CollegeViewSet(viewsets.ModelViewSet):
    queryset = College.objects.all()
    serializer_class = CollegeSerializer

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

class LectureHallViewSet(viewsets.ModelViewSet):
    queryset = LectureHall.objects.all()
    serializer_class = LectureHallSerializer

class LecturerViewSet(viewsets.ModelViewSet):
    queryset = Lecturer.objects.all()
    serializer_class = LecturerSerializer

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer

@api_view(['POST'])
def api_timetable_generate(request):
    success, message, unscheduled = generate_timetable()
    
    unscheduled_data = []
    for item in unscheduled:
        unscheduled_data.append({
            'course': item['course'].code,
            'reason': item['reason']
        })
        
    return Response({
        'success': success,
        'message': message,
        'unscheduled': unscheduled_data
    }, status=status.HTTP_200_OK if success else status.HTTP_207_MULTI_STATUS)

@api_view(['GET'])
def api_timetable_view(request):
    entries = TimetableEntry.objects.select_related(
        'course', 'course__department', 'lecturer', 'hall', 'time_slot'
    )

    department_id = request.query_params.get('department')
    lecturer_id = request.query_params.get('lecturer')
    hall_id = request.query_params.get('hall')
    day = request.query_params.get('day')
    level = request.query_params.get('level')

    if department_id:
        entries = entries.filter(
            Q(course__department_id=department_id) |
            Q(course__shared_departments__id=department_id) |
            Q(course__course_type='general')
        ).distinct()
    if lecturer_id:
        entries = entries.filter(lecturer_id=lecturer_id)
    if hall_id:
        entries = entries.filter(hall_id=hall_id)
    if day:
        entries = entries.filter(time_slot__day=day)
    if level:
        entries = entries.filter(course__level=level)

    serializer = TimetableEntrySerializer(entries, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def api_bulk_upload(request):
    try:
        if 'colleges_file' in request.FILES:
            try:
                df = pd.read_csv(request.FILES['colleges_file']) if request.FILES['colleges_file'].name.endswith('.csv') else pd.read_excel(request.FILES['colleges_file'])
                for _, row in df.iterrows():
                    if pd.notna(row.get('code')) and pd.notna(row.get('name')):
                        College.objects.get_or_create(code=str(row['code']).strip(), defaults={'name': str(row['name']).strip()})
            except Exception as e:
                return Response({'success': False, 'message': f"Error in Colleges file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        if 'departments_file' in request.FILES:
            try:
                df = pd.read_csv(request.FILES['departments_file']) if request.FILES['departments_file'].name.endswith('.csv') else pd.read_excel(request.FILES['departments_file'])
                for _, row in df.iterrows():
                    if pd.notna(row.get('code')) and pd.notna(row.get('name')):
                        college = College.objects.filter(code=str(row['college_code']).strip()).first() if pd.notna(row.get('college_code')) else None
                        Department.objects.get_or_create(code=str(row['code']).strip(), defaults={
                            'name': str(row['name']).strip(),
                            'college': college
                        })
            except Exception as e:
                return Response({'success': False, 'message': f"Error in Departments file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        
        if 'halls_file' in request.FILES:
            try:
                df = pd.read_csv(request.FILES['halls_file']) if request.FILES['halls_file'].name.endswith('.csv') else pd.read_excel(request.FILES['halls_file'])
                for _, row in df.iterrows():
                    if pd.notna(row.get('name')):
                        name = str(row['name']).strip()
                        if not LectureHall.objects.filter(name__iexact=name).exists():
                            LectureHall.objects.create(
                                name=name,
                                capacity=int(row['capacity']),
                                hall_type=row.get('hall_type', 'college')
                            )
            except Exception as e:
                return Response({'success': False, 'message': f"Error in Halls file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        
        if 'lecturers_file' in request.FILES:
            try:
                df = pd.read_csv(request.FILES['lecturers_file']) if request.FILES['lecturers_file'].name.endswith('.csv') else pd.read_excel(request.FILES['lecturers_file'])
                for _, row in df.iterrows():
                    if pd.notna(row.get('staff_id')):
                        col = College.objects.filter(code=str(row['college_code']).strip()).first() if pd.notna(row.get('college_code')) else None
                        if col:
                            Lecturer.objects.get_or_create(staff_id=str(row['staff_id']).strip(), defaults={
                                'first_name': str(row['first_name']).strip(),
                                'last_name': str(row['last_name']).strip(),
                                'college': col,
                                'email': str(row.get('email', '')).strip() if pd.notna(row.get('email')) else ''
                            })
            except Exception as e:
                return Response({'success': False, 'message': f"Error in Lecturers file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        if 'courses_file' in request.FILES:
            try:
                df = pd.read_csv(request.FILES['courses_file']) if request.FILES['courses_file'].name.endswith('.csv') else pd.read_excel(request.FILES['courses_file'])
                for _, row in df.iterrows():
                    if pd.notna(row.get('code')):
                        dept = Department.objects.filter(code=str(row['department_code']).strip()).first() if pd.notna(row.get('department_code')) else None
                        lecturer = Lecturer.objects.filter(staff_id=str(row['lecturer_staff_id']).strip()).first() if pd.notna(row.get('lecturer_staff_id')) else None
                        if dept:
                            Course.objects.get_or_create(code=str(row['code']).strip(), defaults={
                                'name': str(row['name']).strip(),
                                'department': dept,
                                'level': int(row['level']),
                                'course_type': str(row.get('course_type', 'departmental')).strip(),
                                'units': int(row['units']),
                                'hours': int(row.get('hours', 2)),
                                'student_count': int(row['student_count']),
                                'lecturer': lecturer
                            })
            except Exception as e:
                return Response({'success': False, 'message': f"Error in Courses file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'success': True, 'message': 'Bulk upload processed successfully!'})
        
    except Exception as e:
        return Response({'success': False, 'message': f"Error processing file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
