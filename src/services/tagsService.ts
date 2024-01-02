import db from '../lib/db';

const tagsService = {
  async getPostsCount(tagId: string) {
    // @todo: handle alias
    const count = await db.postTag.count({
      where: {
        fk_tag_id: tagId,
      },
    });
    return count;
  },
};

export default tagsService;
