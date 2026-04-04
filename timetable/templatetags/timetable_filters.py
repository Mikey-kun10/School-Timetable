from django import template
from django.forms import CheckboxInput, CheckboxSelectMultiple

register = template.Library()


@register.filter(name='key')
def key(dictionary, k):
    """Access a dictionary value by key in templates.
    Handles both string and integer keys.
    Usage: {{ mydict|key:"mykey" }}
    """
    if not isinstance(dictionary, dict):
        return ''
    # Try the key as-is first
    result = dictionary.get(k)
    if result is not None:
        return result
    # If key is a string that looks like an integer, try int
    if isinstance(k, str) and k.isdigit():
        return dictionary.get(int(k), '')
    return ''


@register.filter(name='is_checkbox')
def is_checkbox(field):
    """Check if a form field uses a checkbox widget.
    Usage: {% if field|is_checkbox %}
    """
    return isinstance(field.field.widget, (CheckboxInput, CheckboxSelectMultiple))
