## Migration from Sequelize

## 1. Manual Sync
- AuthToken

## 2. Migrations
- SetDefaultUUID
- SetDefaultDate

### (This process can be skipped for now)
```sql
insert into post_tags (fk_tag_id, fk_post_id)
select fk_tag_id, fk_post_id from posts_tags
```
