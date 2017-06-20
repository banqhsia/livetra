const VueSelect2 = {
  props: ['options', 'value'],
  template: '<select><slot></slot></select>',
  mounted: function () {
    var vm = this
    $(this.$el)
      .select2({ data: this.options })
      .val(this.value)
      .trigger('change')
      .on('change', function () {
        vm.$emit('input', this.value);
      });
  },
  watch: {
    value: function (value) {
      $(this.$el).val(value).trigger('change');
    },
    options: function (options) {
      $(this.$el).select2({ data: options });
      $(this.$el).val(this.value).trigger('change'); //載入資料後，要重新設一下value
    }
  },
  destroyed: function () {
    $(this.$el).off().select2('destroy');
  }
};