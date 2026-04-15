from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'colleges', views.CollegeViewSet)
router.register(r'departments', views.DepartmentViewSet)
router.register(r'halls', views.LectureHallViewSet)
router.register(r'lecturers', views.LecturerViewSet)
router.register(r'courses', views.CourseViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('timetable/generate/', views.api_timetable_generate, name='api_timetable_generate'),
    path('timetable/view/', views.api_timetable_view, name='api_timetable_view'),
    path('upload/', views.api_bulk_upload, name='api_bulk_upload'),
]
