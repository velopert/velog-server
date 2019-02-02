## Migration from Sequelize

insert into post_tags (fk_tag_id, fk_post_id)
select fk_tag_id, fk_post_id from posts_tags
