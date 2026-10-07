import pytest

from vacina_nlp.calendar_data import load_calendar
from vacina_nlp.service import get_service


@pytest.fixture(scope="session")
def service():
    """Serviço completo (treina o classificador uma vez para toda a sessão de testes)."""
    return get_service()


@pytest.fixture(scope="session")
def calendar():
    return load_calendar()
