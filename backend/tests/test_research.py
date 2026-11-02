import json
import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
import pytest
from fastapi import HTTPException
from uuid import uuid4
from fastapi.testclient import TestClient
from app.main import create_app
from app.core.config import Settings
from app.api.research import access, extract_findings, findings_schema, provider_outcome


def test_research_requires_authentication():
    with TestClient(create_app(Settings(_env_file=None,database_url=None))) as client:
        response=client.post('/api/v1/research',json={'workspace_id':str(uuid4()),'query':'Find sourced companies in Germany'})
        assert response.status_code==401


def test_capabilities_does_not_expose_provider_keys():
    with TestClient(create_app(Settings(_env_file=None,database_url=None,openai_api_key='private-key',research_owner_email='owner@example.invalid'))) as client:
        response=client.get('/api/v1/capabilities')
        assert response.json()['research'] is True
        assert 'private-key' not in response.text
        assert response.json()['outbound_sending'] is False


def test_research_rejects_uncited_companies():
    candidate={'name':'Example','website':'https://example.com','country':'Germany','industry':'Software','description':'Example description','services':[],
      'evidence':[{'title':'Hiring','kind':'Hiring','source_url':'https://example.com/jobs','excerpt':'Example excerpt','occurred_on':None}]}
    response={'output':[{'type':'message','content':[{'type':'output_text','text':json.dumps({'summary':'Found a company','companies':[candidate]})}]}]}
    assert extract_findings(response)['companies']==[]
    response['output'].append({'type':'web_search_call','action':{'sources':[{'url':'https://example.com/jobs'}]}})
    result=extract_findings(response)
    assert len(result['companies'])==1
    assert result['review_required'] is True


def test_strict_findings_schema_has_no_optional_properties():
    schema=findings_schema()
    assert '"format": "uri"' not in json.dumps(schema)
    assert '"default"' not in json.dumps(schema)
    assert schema['additionalProperties'] is False
    assert set(schema['required'])==set(schema['properties'])
    for definition in schema['$defs'].values():
        if definition.get('type')=='object':
            assert definition['additionalProperties'] is False
            assert set(definition['required'])==set(definition['properties'])


def research_access_request(member, licensed, owner='owner@example.invalid'):
    connection=AsyncMock()
    connection.scalar.side_effect=[member,licensed]
    context=MagicMock()
    context.__aenter__=AsyncMock(return_value=connection)
    context.__aexit__=AsyncMock(return_value=False)
    engine=MagicMock()
    engine.connect.return_value=context
    return SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(
      settings=Settings(_env_file=None,research_owner_email=owner),database=SimpleNamespace(engine=engine))))


def test_public_signup_does_not_grant_paid_ai_access():
    with pytest.raises(HTTPException) as caught:
        asyncio.run(access(research_access_request(True,False),uuid4(),uuid4()))
    assert caught.value.status_code==403


def test_nonmember_cannot_access_even_licensed_workspace():
    with pytest.raises(HTTPException) as caught:
        asyncio.run(access(research_access_request(False,True),uuid4(),uuid4()))
    assert caught.value.status_code==403


def test_licensed_workspace_member_can_research():
    asyncio.run(access(research_access_request(True,True),uuid4(),uuid4()))


@pytest.mark.parametrize('state',['queued','in_progress'])
def test_pending_provider_status_stays_running(state):
    assert provider_outcome({'status':state})==('Running',{},None)


def test_provider_output_limit_has_specific_error_and_no_partial_findings():
    status,result,error=provider_outcome({'status':'incomplete','incomplete_details':{'reason':'max_output_tokens'},'output':[{'type':'message','content':[{'type':'output_text','text':'partial-private-content'}]}]})
    assert status=='Failed'
    assert 'output limit' in error
    assert result=={'diagnostics':{'provider_status':'incomplete','incomplete_reason':'max_output_tokens'}}
    assert 'partial-private-content' not in json.dumps(result)


def test_provider_quota_error_is_actionable_without_disclosing_raw_message():
    status,result,error=provider_outcome({'status':'failed','error':{'code':'insufficient_quota','message':'private billing details sk-private'}})
    assert status=='Failed'
    assert result['diagnostics']['error_code']=='insufficient_quota'
    assert 'Billing' in error
    assert 'sk-private' not in error


def test_unknown_provider_error_is_not_copied_to_clients():
    _,result,error=provider_outcome({'status':'failed','error':{'code':'secret-code','message':'private prompt'}})
    assert result['diagnostics']['error_code']=='unknown_provider_error'
    assert 'secret-code' not in error
    assert 'private prompt' not in error


def test_reconcile_configuration_can_be_disabled():
    assert Settings(_env_file=None,research_reconcile_run_id='').research_reconcile_run_id is None

