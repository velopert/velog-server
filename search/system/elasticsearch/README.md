## Create Index

**GET http://localhost:9200/posts** 

```json
{
    "settings": {
        "analysis": {
            "tokenizer": {
                "korean_nori_tokenizer": {
                    "type": "nori_tokenizer",
                    "decompound_mode": "mixed"
                }
            },
            "analyzer": {
                "nori_analyzer": {
                    "type": "custom",
                    "tokenizer": "korean_nori_tokenizer",
                    "filter": [
                        "nori_posfilter"
                    ]
                }
            },
            "filter": {
                "nori_posfilter": {
                    "type": "nori_part_of_speech",
                    "stoptags": [
                        "E",
                        "IC",
                        "J",
                        "MAG",
                        "MM",
                        "NA",
                        "NR",
                        "SC",
                        "SE",
                        "SF",
                        "SH",
                        "SL",
                        "SN",
                        "SP",
                        "SSC",
                        "SSO",
                        "SY",
                        "UNA",
                        "UNKNOWN",
                        "VA",
                        "VCN",
                        "VCP",
                        "VSV",
                        "VV",
                        "VX",
                        "XPN",
                        "XR",
                        "XSA",
                        "XSN",
                        "XSV"
                    ]
                }
            }
        }
    },
    "mappings": {
        "properties": {
            "title": {
                "type": "text",
                "analyzer": "nori_analyzer",
                "fields": {
                    "raw": {
                        "type": "text"
                    }
                }
            },
            "body": {
                "type": "text",
                "analyzer": "nori_analyzer",
                "fields": {
                    "raw": {
                        "type": "text"
                    }
                }
            }
        }
    }
}
```

## Search Query

**POST http://localhost:9200/posts/_search**
```json
{
    "query": {
        "script_score": {
            "query": {
                "bool": {
                    "should": [
                        {
                            "match_phrase": {
                                "title": {
                                    "query": "웹",
                                    "boost": 5
                                }
                            }
                        },
                        {
                            "match_phrase": {
                                "body": {
                                    "query": "웹",
                                    "boost": 1
                                }
                            }
                        }
                    ]
                }
            },
            "script": {
                "source": "_score + doc['likes'].value * 5 + doc['views'].value * 0.005"
            }
        }
    }
}
```