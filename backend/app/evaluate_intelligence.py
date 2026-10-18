"""Reproduce the synthetic engineering evaluation: python -m app.evaluate_intelligence."""
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter
from types import SimpleNamespace
import json
from .intelligence import group_articles

FIXTURES = [
 ('orbit','Orion satellite launch reaches lunar orbit'),('orbit','Orion satellite launch reaches lunar orbit successfully'),
 ('battery','Helios laboratory announces sodium battery pilot'),('battery','Helios laboratory announces sodium battery pilot expansion'),
 ('museum','Riverton museum opens modern sculpture gallery'),('museum','Riverton museum opens modern sculpture gallery exhibition'),
 ('rates','Central bank discusses household borrowing costs'),('music','Rock band rehearses acoustic concert arrangements')]

def row(i, title):
    return SimpleNamespace(slug=f'eval-{i}', title=title,
        source=SimpleNamespace(id=i,name=f'Fixture {i}',domain=f'{i}.invalid',region='Global'),
        category=SimpleNamespace(slug='technology',name='Technology',description=''), category_id=1,
        published_at=datetime(2026,10,17,tzinfo=timezone.utc),is_demo=True,summary=None,url=None,country='Global',language='English')

def evaluate():
    groups=group_articles([row(i,title) for i,(_,title) in enumerate(FIXTURES)])
    actual={frozenset([a.slug,b.slug]) for g in groups for pos,a in enumerate(g['articles']) for b in g['articles'][pos+1:]}
    expected={frozenset([f'eval-{i}',f'eval-{j}']) for i,(label,_) in enumerate(FIXTURES) for j,(other,_) in enumerate(FIXTURES) if i<j and label==other}
    tp=len(actual&expected)
    large=[row(i,f'astronomy{i} telescope{i} observation{i} dataset{i}') for i in range(300)]
    times=[]
    for _ in range(5):
        start=perf_counter(); output=group_articles(large);times.append(round((perf_counter()-start)*1000,2))
    return {'fixture_kind':'Synthetic engineering smoke evaluation, not a real-news accuracy benchmark',
        'labeled_headlines':len(FIXTURES),'expected_pairs':len(expected),'predicted_pairs':len(actual),
        'true_positive_pairs':tp,'false_positive_pairs':len(actual-expected),'false_negative_pairs':len(expected-actual),
        'precision':tp/len(actual) if actual else None,'recall':tp/len(expected),
        'fragmentation_benchmark':{'headlines':300,'groups':len(output),'milliseconds_five_runs':times},
        'limitations':['Tiny hand-written English dataset; not evidence of field accuracy.',
        'No multilingual, paraphrase, named-entity ambiguity or live traffic validation.',
        'Timings are local engine-only runs; exclude database, HTTP and production contention.']}

if __name__ == '__main__':
    report=json.dumps(evaluate(),indent=2)
    Path(__file__).resolve().parents[2].joinpath('docs/INTELLIGENCE_EVALUATION.json').write_text(report,encoding='utf-8')
    print(report)
